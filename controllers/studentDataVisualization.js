'use strict';

const concept = require('../models/Concept');
const Student = require('../models/Student');
const StudentModel = require('../models/StudentModel');
const consolex = require('../utilities/consolex');

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

    static createConceptHeatmap(student) {

        var xAxisLabels = student.studentModel.modelCriteria();
        var yAxisLabels = student.studentModel.modelConceptIds().reverse();

        var conceptScoreData = [];
        var conceptScoreDetails = {};

        for (var x = 0; x < xAxisLabels.length; ++x) {
            for (var y = 0; y < yAxisLabels.length; ++y) {
                var score = student.studentModel.conceptScoreInfo(xAxisLabels[x], yAxisLabels[y]);
                if (score) {
                    var scaledScore = Math.round(score.scaledScore * 1000) / 10;
                    conceptScoreData.push([
                        x,
                        y,
                        scaledScore
                    ]);
                    conceptScoreDetails[x + "," + y] = {
                        correct: score.correct,
                        total: score.total
                    };
                }
            }
        }

        return {
            chart: {
                type: 'heatmap',
                marginTop: 40,
                marginBottom: 80,
                plotBorderWidth: 1
            },

            tooltip: {
                conceptScoreDetails: conceptScoreDetails
            },

            title: {
                text: "Criteria/Concept Heatmap"
            },

            xAxis: {
                categories: xAxisLabels,
                title: "Criteria"
            },

            yAxis: {
                categories: yAxisLabels,
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
                data: conceptScoreData,
                dataLabels: {
                    enabled: true,
                    color: '#000000'
                }
            }]
        };
    }
}

module.exports = StudentDataVisualization;