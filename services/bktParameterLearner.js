'use strict';

const ComputeKTparamsAll = require("./computeKTparamsAll");
const MongoClient = require('mongodb').MongoClient;

class BKTParameterLearner {
	constructor() {
        this.conceptParameters = {};
        this.client = null; 
    }

    runAsync(studentIds) {
        let url = new URL(process.env.MONGODB_URI);
        let dbName = url.pathname.substr(1);
        console.info("Connect to: %s db: %s", process.env.MONGODB_URI, dbName);
        return MongoClient.connect(process.env.MONGODB_URI).then((client) => {
            this.client = client;
            return client.db(dbName);
        }).then((db) => {
            return this._queryConceptObservations(studentIds, db);
        }).then((conceptObservations) => {
            console.info(`Concept observations queried: ${conceptObservations.length}`);
            let computeKTparamsAll = new ComputeKTparamsAll();
            return computeKTparamsAll.computeParameters(conceptObservations);            
        }).finally(() => {
            if (this.client) {
                this.client.close();
            }
        });
        // return readFileAsync(global.observationDataFilename)
        //     .then((testDataCsv) => parseAsync(testDataCsv)).then((testData) => {
        //         let computeKTparamsAll = new ComputeKTparamsAll();
        //         let csv = computeKTparamsAll.computelzerot(testData);

        //         return writeFileAsync(parametersFilename, csv);
        //     });
        //return Promise.resolve(studentIds.join(","));
    }

    _queryConceptObservations(studentIds, db) {
        console.info("Students to export: %d", studentIds.length);
        let query = {};
        for (let heading of ["conceptId", "isCorrect", "studentId"]) {
            query[heading] = {$exists: true, $not: {$size: 0}};
        }

        query.studentId = { $in: studentIds};

        return db.collection('conceptobservations')
        .find(
            query,
            {
                "sort": [['conceptId','asc'], ['studentId','asc'], ['timestamp','asc']]
            }
        )
        .toArray();
    }
}

module.exports = BKTParameterLearner;