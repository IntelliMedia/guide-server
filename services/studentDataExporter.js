'use strict';
var fs = require('fs');
var archiver = require('archiver');
const ConceptObservation = require('../models/ConceptObservation');
const Session = require('../models/Session');

/**
 * This class exports student data to a zip file
 */
class StudentDataExporter {
    constructor(filename, response) {
        this._filename = filename + '.zip';
        this._response = response;
        this._zip = archiver('zip');
        this._zip.pipe(response);
        this._studentsExportedCount = 0;

        this._response.writeHead(200, {
            'Content-Type': 'application/zip',
            'Content-disposition': 'attachment; filename=' + this._filename
        });
    }

    finalize() {
        // Tell the browser that this is a zip file.
        return new Promise((resolve, reject) => {
            try
            {
                console.info(`Exported ${this._studentsExportedCount} students to ${this._filename}`)
                resolve(this._zip.finalize());
            } catch(err) {
                reject(err);
            }
        });
    }

    add(students) {
        students = Array.isArray(students) ? students : [students];
        let promises = [];
        students.forEach((student) => {
            promises.push(this._exportStudentModel(student)
                .then(() => this._exportConceptObservations(student))
                .then(() => this._exportSessions(student)));
            ++this._studentsExportedCount;
        });

        if (promises.length > 0) {
            return Promise.all(promises);
        } else {
            return Promise.reject(new Error('No students were found to export.'));
        }
    }

    _exportStudentModel(student) {
        return Promise.resolve(
            this._zip.append(JSON.stringify(student.studentModel, null, 2), { name: 'StudentModels/' + student.id + ".json" })
        );
    }

    _exportConceptObservations(student) {
        return ConceptObservation.find({'studentId': student.id}).lean().exec()
            .then((observations) => {
                if (observations && observations.length > 0) {
                    this._zip.append(JSON.stringify(observations, null, 2), { name: 'ConceptObservations/' + student.id + ".json" });
                }
            });
    }

    _exportSessions(student) {
        return Session.find({'studentId': student.id}).exec()
            .then((sessions) => {
                sessions.forEach((session) => {
                    if (session.events && session.events.length > 0) {
                      this._zip.append(JSON.stringify(session.events, null, 2), { name: 'Sessions/' + student.id + '-' + session.id + ".json" });
                    }
                });
            });
    }
}

module.exports = StudentDataExporter;