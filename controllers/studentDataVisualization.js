'use strict';

const concept = require('../models/Concept');
const Student = require('../models/Student');
const StudentModel = require('../models/StudentModel');
const consolex = require('../utilities/consolex');
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

        Student.findOne({ 'id': studentId }, (err, student) => {
            if (err) { return next(err); }

            switch (view) {
                case 'concept-chart':
                    res.end(JSON.stringify(StudentDataVisualization.createConceptChart(student)));
                    break;

                case 'concept-heatmap':
                    res.end(JSON.stringify(StudentDataVisualization.createConceptHeatmap(student)));
                    break;

                default:
                    res.end(JSON.stringify(student));
            }
        })
            .exec()
            .catch((err) => {
                consolex.exception(err);
                req.flash('errors', { msg: 'Student with ID is not found: ' + studentId });
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

        collection.forEach((a) => { 
            chartInfo.yLabels.push(a[yAxisField]);
        });
        chartInfo.yLabels = _.uniq(chartInfo.yLabels).sort();

        collection.forEach((g) => {
            g[innerCollectionField].forEach((c) => {
                chartInfo.xLabels.push(c[xAxisField]);
            });
        });
        chartInfo.xLabels = _.uniq(chartInfo.xLabels).sort();

        for (let x = 0; x < chartInfo.xLabels.length; ++x) {
            let xLabel = chartInfo.xLabels[x];
            for (let y = 0; y < chartInfo.yLabels.length; ++y) {
                let yLabel = chartInfo.yLabels[y];

                let yEntry = collection.find((g) => g[yAxisField] == yLabel);
                let dataPoint = yEntry[innerCollectionField].find((c) => c[xAxisField] === xLabel);

                    var scaledScore = Math.round(dataPoint.score * 1000) / 10;
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

        return chartInfo;
    }

    static createConceptHeatmap(student) {

        let chartInfo = StudentDataVisualization.getConceptScores(
            student.studentModel.conceptsByChallenge, 
            "concepts", 
            "challengeId", 
            "conceptId");

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
                text: "Criteria/Concept Heatmap"
            },

            xAxis: {
                categories: chartInfo.xLabels,
                title: "Criteria"
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
}

module.exports = StudentDataVisualization;