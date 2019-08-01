'use strict';

const ComputeKTparamsAll = require("./computeKTparamsAll");
const MongoClient = require('mongodb').MongoClient;

class BKTParameterLearner {
	constructor() {
        this.conceptParameters = {};
        this.client = null; 
    }

    runAsync(studentIds) {
        console.info("Start BKT parameter learner");
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
            let csv = computeKTparamsAll.computeParameters(conceptObservations);    
            return csv;        
        }).finally(() => {
            if (this.client) {
                this.client.close();
            }
        });
    }

    _queryConceptObservations(studentIds, db) {
        let query = {};
        for (let heading of ["conceptId", "isCorrect", "studentId"]) {
            query[heading] = {$exists: true, $not: {$size: 0}};
        }

        query.studentId = { $in: studentIds};

        let displayableFilter = JSON.stringify(query, null, 2).substring(1, 256);
        console.info("Query concept observations | filter: " + displayableFilter);
        
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