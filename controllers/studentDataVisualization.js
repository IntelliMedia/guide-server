'use strict';

const concept = require('../models/Concept');
const Student = require('../models/Student');
const StudentModel = require('../models/StudentModel');
const _ = require('lodash');

/**
 * This class creates charts based on student data using Highcharts service
 */
class StudentDataVisualization {

    static getStudent(req, res) {
        const studentId = req.params.studentId;
        if (!studentId) {
            return res.redirect('/');
        }

        var view = req.query.view;

        Student.findOne({ 'id': studentId }).exec().then((student) => {
            let chartData = undefined;
            switch (view) {
                case 'aggregate-concept-heatmap':
                    chartData = StudentDataVisualization.createAggregateConceptHeatmap(student);
                    break;

                case 'concept-by-challenge-heatmap':
                    chartData = StudentDataVisualization.createConceptByChallengeHeatmap(student);
                    break;

                case 'concept-by-trait-heatmap':
                    chartData = StudentDataVisualization.createConceptByTraitHeatmap(student);
                    break;

                case 'snapshots-by-concept-linegraph':
                    chartData = StudentDataVisualization.createSnapshotsByConcept(student);
                    break;

                default:
                    chartData = JSON.stringify(student);
            }

            res.end(JSON.stringify(chartData));
        })
        .catch((err) => {
            console.error(err);
            req.flash('errors', { msg: 'Student with ID is not found: ' + studentId + ". " + err.toString()});
            return res.redirect('/');
        });
    }

    static createConceptChart(student) {
        var concepts = concept.getAll();
        var conceptIds = concepts.map(function (a) { return a.Id; });
        var conceptStateValues = [];

        concepts.forEach(function (concept) {
            var state = student.studentModel.conceptState(concept.Id);
            var value = (state != null ? state.value : 0);

            conceptStateValues.push(value);
        });

        return {
            chart: {
                type: 'bar',
            },
            title: {
                text: 'Concepts'
            },
            xAxis: {
                categories: conceptIds
            },
            yAxis: {
                title: {
                    text: 'Score'
                }
            },
            series: [{
                name: student.id,
                data: conceptStateValues
            }]
        };
    }

    static getConceptScores(collection, innerCollectionField, yAxisField, xAxisField) {

        let chartInfo = {
            xLabels: [],
            yLabels: [],
            data: [],
            dataDetails: {}
        }

        if (yAxisField) {
            collection.forEach((a) => { 
                chartInfo.yLabels.push(a[yAxisField]);
            });
            chartInfo.yLabels = _.uniq(chartInfo.yLabels).sort();
        } else {
            chartInfo.yLabels = [""];
        }

        if (yAxisField) {
            collection.forEach((g) => {
                g[innerCollectionField].forEach((c) => {
                    chartInfo.xLabels.push(c[xAxisField]);
                });
            });
        } else {
            collection.forEach((c) => {
                chartInfo.xLabels.push(c[xAxisField]);
            });
        }
        chartInfo.xLabels = _.uniq(chartInfo.xLabels).sort();

        for (let x = 0; x < chartInfo.xLabels.length; ++x) {
            let xLabel = chartInfo.xLabels[x];
            for (let y = 0; y < chartInfo.yLabels.length; ++y) {
                let yLabel = chartInfo.yLabels[y];

                let dataPoint = undefined;
                if (yAxisField) {
                    let yEntry = collection.find((g) => g[yAxisField] == yLabel);
                    dataPoint = yEntry[innerCollectionField].find((c) => c[xAxisField] === xLabel);
                } else {
                    dataPoint = collection.find((c) => c[xAxisField] === xLabel);
                }

                if (dataPoint) {
                    let scaledScore = Math.round(dataPoint.score * 1000) / 10;
                    chartInfo.data.push([
                        x,
                        y,
                        scaledScore
                    ]);
                    chartInfo.dataDetails[x + "," + y] = {
                        correct: dataPoint.totalCorrect,
                        total: dataPoint.totalAttempts
                    };
                }
            }
        }

        return chartInfo;
    }

    static createAggregateConceptHeatmap(student) {
        
        let chartInfo = StudentDataVisualization.getConceptScores(
            student.studentModel.conceptsAggregated, 
            "concepts", 
            undefined, 
            "conceptId");

        return StudentDataVisualization.createConceptHeatmap(chartInfo, "Aggregate");
    }

    static createConceptByTraitHeatmap(student) {
        
        let chartInfo = StudentDataVisualization.getConceptScores(
            student.studentModel.conceptsByTrait, 
            "concepts", 
            "trait", 
            "conceptId");

        return StudentDataVisualization.createConceptHeatmap(chartInfo, "Trait");
    }

    static createConceptByChallengeHeatmap(student) {

        let chartInfo = StudentDataVisualization.getConceptScores(
            student.studentModel.conceptsByChallenge, 
            "concepts", 
            "challengeId", 
            "conceptId");

        return StudentDataVisualization.createConceptHeatmap(chartInfo, "Challenge");
    }

    static createConceptHeatmap(chartInfo, yLabel) {

        return {
            chart: {
                type: 'heatmap',
                marginTop: 40,
                marginBottom: 80,
                plotBorderWidth: 1
            },

            tooltip: {
                conceptScoreDetails: chartInfo.dataDetails
            },

            title: {
                text: yLabel + "/Concept Heatmap"
            },

            xAxis: {
                categories: chartInfo.xLabels,
                title: "Target"
            },

            yAxis: {
                categories: chartInfo.yLabels,
                title: "Concepts"
            },

            colorAxis: {
                min: 0,
                max: 100,
                stops: [
                    [0, '#aa0000'],
                    [0.5, '#eeee00'],
                    [1, '#00aa00']
                ]
            },

            legend: {
                align: 'right',
                layout: 'vertical',
                margin: 0,
                verticalAlign: 'top',
                y: 25,
                symbolHeight: 280
            },

            series: [{
                name: 'Concept Score',
                borderWidth: 1,
                data: chartInfo.data,
                dataLabels: {
                    enabled: true,
                    color: '#000000'
                }
            }]
        };
    }

    static createSnapshotsByConcept(student) {
        
        let collection = student.studentModel.snapshotsByConceptId;
        // y axis is normalized score (0-1)
        let innerCollectionField = "snapshots";
        let seriesField = "conceptId";
        let xAxisField = "timestamp";

        let chartInfo = {
            xLabels: [],
            seriesLabels: [],
            series: [],
            dataDetails: {}
        }

        collection.forEach((a) => { 
            chartInfo.seriesLabels.push(a[seriesField]);
        });
        chartInfo.seriesLabels = _.uniq(chartInfo.seriesLabels).sort();

        collection.forEach((g) => {
            g[innerCollectionField].forEach((c) => {
                chartInfo.xLabels.push(c[xAxisField]);
            });
        });
        chartInfo.xLabels = _.uniq(chartInfo.xLabels).sort();

        for (let s = 0; s < chartInfo.seriesLabels.length; ++s) {
            let seriesLabel = chartInfo.seriesLabels[s];
            let currentSeries = {
                name: seriesLabel,
                data: []
            };
            for (let x = 0; x < chartInfo.xLabels.length; ++x) {
                let xLabel = chartInfo.xLabels[x];

                let seriesEntry = collection.find((g) => g[seriesField] == seriesLabel);
                let dataPoint = seriesEntry[innerCollectionField].find((c) => c[xAxisField] === xLabel);
                if (dataPoint) { 
                    let scaledScore = Math.round(dataPoint.score * 1000) / 10;
                    currentSeries.data.push([Math.round(dataPoint.timestamp.getTime()), scaledScore]);
                }
            }
            chartInfo.series.push(currentSeries);
        }

        return StudentDataVisualization.createSnapshotsGraph(chartInfo);
    }

    static createSnapshotsGraph(chartInfo, yLabel) {

        return {
            chart: {
                type: 'spline'
            },

            title: {
                text: 'Concept Score Snapshots'
            },
            xAxis: {
                type: 'datetime',
                dateTimeLabelFormats: { // don't display the dummy year
                    second: '%H:%M:%S'
                },
                title: {
                    text: 'timestamp'
                }
            },
            yAxis: {
                title: {
                    text: 'Score'
                },
                max: 100,
                min: 0
            },
            legend: {
                layout: 'vertical',
                align: 'right',
                verticalAlign: 'middle'
            },
        
            plotOptions: {
                spline: {
                    marker: {
                        enabled: true
                    }
                }
            },
        
            series: chartInfo.series
        };
    }
}

module.exports = StudentDataVisualization;