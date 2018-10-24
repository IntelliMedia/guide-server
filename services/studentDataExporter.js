'use strict';
var fs = require('fs');
var archiver = require('archiver');
const ConceptObservation = require('../models/ConceptObservation');
const Session = require('../models/Session');
const streams = require('memory-streams');
const datex = require('../utilities/datex');

/**
 * This class exports student data to a zip file
 */
class StudentDataExporter {
    constructor(exportName, response) {
        this.exportName = exportName;
        this._filename = 'GuideExport-' + exportName + '.zip';
        this._response = response;
        this._zip = archiver('zip');
        this._studentsExportedCount = 0;
    }

    finalize() {
        // Tell the browser that this is a zip file.
        return new Promise((resolve, reject) => {
            try
            {
                console.info(`Exported ${this._studentsExportedCount} students to ${this._filename}`)
                this._response.writeHead(200, {
                    'Content-Type': 'application/zip',
                    'Content-disposition': 'attachment; filename=' + this._filename
                });
                this._zip.pipe(this._response);
                resolve(this._zip.finalize());
            } catch(err) {
                reject(err);
            }
        });
    }

    add(students) {
        students = Array.isArray(students) ? students : [students];
        this._exportStudentsSummary(students);

        let sessionSummaries = [];
        let promises = [];
        students.forEach((student) => {
            promises.push(this._exportStudentModel(student)
                .then(() => this._exportConceptObservations(student))
                .then(() => this._exportSessions(student))
                .then((sessionSummary) => {
                    sessionSummaries.push(sessionSummary);
                }));
            ++this._studentsExportedCount;
        });

        if (promises.length > 0) {
            return Promise.all(promises).then(() => {
                if (sessionSummaries.length > 0) {
                    this._exportChallengeSummaries(sessionSummaries);
                }
            })
        } else {
            return Promise.reject(new Error('No students were found to export.'));
        }
    }

    _exportStudentsSummary(students) {
        let [headings, objs] = this._flattenStudentObjects(students);
        this._zip.append(this._toCsv(headings, objs), { name: 'csv/Summary-' + this.exportName + ".csv" });
    }

    _flattenStudentObjects(students) {
        let flatObjs = [];
        let headings = new Set();
        students.forEach((student) => {
            let flatStudent = {
                studentId: student.id
            };
            flatObjs.push(flatStudent);

            student.studentModel.bktConceptStates.forEach((state) =>  {
                for (let property of ['probabilityLearned', 'totalCorrect', 'totalAttempts']) {
                    let heading = state.conceptId + '-' + property;
                    headings.add(heading);
                    flatStudent[heading] = state[property];
                }

                // Actions
                for (let property of ['totalHints', 'totalBottomOuts', 'totalRemediations']) {
                    let heading = state.conceptId + '-' + property;
                    headings.add(heading);
                    flatStudent[heading] = 0;
                }
            });
            student.studentModel.tutorActionHistory.forEach((item) =>  {
                if (item.action === 'HINT') {
                    let heading = item.context.conceptId + '-totalHints';
                    flatStudent[heading]++;

                    heading = item.context.conceptId + '-totalBottomOuts';
                    if (item.context.isBottomOut) {
                        flatStudent[heading]++;
                    }
                } else if (item.action === 'REMEDIATE') {
                    let heading = item.context.conceptId + '-totalRemediations';
                    flatStudent[heading]++;
                }
            });
        });

        let finalHeadings = Array.from(headings).sort();
        finalHeadings.unshift('studentId');

        return [finalHeadings, flatObjs];
    }

    _exportChallengeSummaries(sessionSummaries) {
        let headings = this._extractChallengeHeadings(sessionSummaries);
        this._zip.append(this._toCsv(headings, sessionSummaries), { name: 'csv/Challenges-' + this.exportName + ".csv" });
    }

    _extractChallengeHeadings(sessionSummaries) {
        let headings = new Set();

        for (let summary of sessionSummaries) {
            Object.keys(summary).forEach((property) => headings.add(property));
        }

        headings.delete('totalSessions');
        headings.delete('studentId');
        let finalHeadings = Array.from(headings).sort();
        finalHeadings.unshift('totalSessions');
        finalHeadings.unshift('studentId');

        return finalHeadings;
    }

    _exportStudentModel(student) {
        return Promise.resolve(
            this._zip.append(JSON.stringify(student, null, 2), { name: 'json/Student-' + student.id + ".json" })
        );
    }

    _exportConceptObservations(student) {
        return ConceptObservation.find({'studentId': student.id}).sort({conceptId: -1}).sort({studentId: -1}).sort({createdAt: -1}).lean().exec()
            .then((observations) => {
                if (observations && observations.length > 0) {
                    let headings = this._observationHeadings();
                    this._zip.append(JSON.stringify(observations, null, 2), { name: 'json/ConceptObservations-' + student.id + ".json" });
                    this._zip.append(this._toCsv(headings, observations), { name: 'csv/ConceptObservations-' + student.id + ".csv" });
                }
            });
    }

    _exportSessions(student) {
        return Session.find({'studentId': student.id}).exec()
            .then((sessions) => {
                sessions.forEach((session) => {
                    if (session.events && session.events.length > 0) {
                      let startTime = new Date(session.events[0].time);
                      this._zip.append(JSON.stringify(session.events, null, 2), { name: 'json/TraceData-' + student.id + '-' + startTime.toFilename() + ".json" });
                    }
                });

                return this._summarizeSessions(student.id, sessions);
            });
    }

    _summarizeSessions(studentId, sessions) {
        let summary = {
            studentId: studentId,
            totalSessions: sessions.length

        };

        sessions.forEach((session) => {
            if (session.events && session.events.length > 0) {
                session.events.forEach((event) => {
                    if (event.action === 'SUBMITTED'
                    || event.action === 'SELECTED'
                    || event.action === 'BRED') {
                        let heading = event.context.challengeId + '-correct';
                        this._zeroIfNotPresent(summary, heading);
                        if (event.context.correct) {
                            summary[heading]++
                        }

                        heading = event.context.challengeId + '-total';
                        this._zeroIfNotPresent(summary, heading);
                        summary[heading]++
                    }
                });
            }
        });

        return summary;
    }

    _zeroIfNotPresent(obj, propertyName) {
        if (!obj.hasOwnProperty(propertyName)) {
            obj[propertyName] = 0;
        }
    }

    _observationHeadings() {
        return ['timestamp', 'conceptId', 'studentId', 'isCorrect', 'challengeType', 'challengeId', 'attribute', 'probabilityLearned'];
    }

    _toCsv(headings, rowObjs) {
        let stream = new streams.WritableStream();

        let heading = headings.join(",");
        let count = 0;
        stream.write(heading + "\n");
        for (let row of rowObjs) {
            if (headings.includes('timestamp') && !row['timestamp']) {
                row['timestamp'] = row['createdAt'];
            }
            let line = headings.map((heading) => this._dataToCell(row[heading])).join(",");
            stream.write(line + "\n");
            ++count;
        }
        let csv  = stream.toString();
        stream.end();

        return csv;
    }

    _dataToCell(value) {
        if (value == undefined || value == null) {
            return '';
        } else if (value instanceof Date) {
            return value.toISOString();
        } else {
            return value;
        }
    }
}

module.exports = StudentDataExporter;