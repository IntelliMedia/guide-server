'use strict';

const ComputeKTparamsAll = require("./computeKTparamsAll");
const MongoClient = require('mongodb').MongoClient;
const si = require('systeminformation');

class BKTParameterLearner {
	constructor() {
        this.conceptParameters = {};
        this.client = null; 
        this.perfStatsHeader = [];
        this.perfStatsValue = [];
        this.outputCsv = "";
        this.statsCsv = "";
        this.startTime = null;
        this.endTime = null;
    }

    runAsync(studentIds) {
        console.info("Start BKT parameter learner");
        this.startTime = new Date();
        this._recordPerformanceStats("StartTime", this.startTime.toISOString());
        let url = new URL(process.env.MONGODB_URI);
        let dbName = url.pathname.substr(1);
        let db;
        console.info("Connect to: %s db: %s", process.env.MONGODB_URI, dbName);
        this._recordPerformanceStats("Database", process.env.MONGODB_URI);
        return MongoClient.connect(process.env.MONGODB_URI).then((client) => {
            this.client = client;
            return this.client.db(dbName);
        }).then((dbConnection) => {
            db = dbConnection; 
            return db.collection('students').count();
        }).then((totalStudents) => {       
            this._recordPerformanceStats("TotalStudentsInDb", totalStudents);     
            if (totalStudents === 0) {
                throw new Error(`Database does not exist or is empty: ${dbName}`);
            }      
            return db.collection('conceptobservations').count();
        }).then((totalConceptObservations) => {       
            this._recordPerformanceStats("TotalConceptObservationsInDb", totalConceptObservations);                                   
            return this._queryStudents(studentIds, db);            
        }).then((studentIdsFound) => {
            this._recordPerformanceStats("StudentIdsFromCSV", studentIds.length);
            this._recordPerformanceStats("StudentIdsFoundInDb", studentIdsFound.length);
            return this._queryConceptObservations(studentIdsFound, db);
        }).then((conceptObservations) => {
            this._recordPerformanceStats("ConceptObservationsFoundInDb", conceptObservations.length);
            let computeKTparamsAll = new ComputeKTparamsAll();
            this.outputCsv = computeKTparamsAll.computeParameters(conceptObservations);    
            this.endTime = new Date();
            this._recordPerformanceStats("EndTime", this.endTime.toISOString());
            this._recordPerformanceStats("RunTime", this.runTimeInSeconds());
            return this._createPerformanceStatsCSVAsync();        
        }).then((statsCsv) => {
            this.statsCsv = statsCsv;
            return this;
        }).finally(() => {
            if (this.client) {
                this.client.close();
            }
        });
    }

    runTimeInSeconds() {
        if (this.startTime == null) {
            return 0;
        }

        let end = this.endTime != null ? this.endTime : new Date();
        return (end - this.startTime) / 1000; 
    }

    _recordPerformanceStats(header, value) {
        this.perfStatsHeader.push(header);
        this.perfStatsValue.push(value);
        console.info("%s=%s", header, value);
    }
    
    _createPerformanceStatsCSVAsync() {
        return si.cpu().then((cpuData) => {
            this._recordPerformanceStats("CpuType", `${cpuData.manufacturer} ${cpuData.brand}`);
            this._recordPerformanceStats("CpuSpeed", cpuData.speed);
            this._recordPerformanceStats("CpuCores", cpuData.cores);
            this._recordPerformanceStats("CpuProcessors", cpuData.processors);
            return si.mem();
        })
        .then((memData) =>  {
            this._recordPerformanceStats("MemTotal", memData.total);

            let csv = [this.perfStatsHeader.join(",")];
            csv.push(this.perfStatsValue.join(","))
            return csv.join("\n");
        });
	} 

    _queryStudents(studentIds, db) {
        let query = {};
        query.id = { $in: studentIds};

        let displayableFilter = JSON.stringify(query, null, 2).substring(1, 256);
        //console.info("Query students | filter: " + displayableFilter);
        
        return db.collection('students').distinct("id", query, {});
    }

    _queryConceptObservations(studentIds, db) {
        let query = {};
        for (let heading of ["conceptId", "isCorrect", "studentId"]) {
            query[heading] = {$exists: true, $not: {$size: 0}};
        }

        query.studentId = { $in: studentIds};

        let displayableFilter = JSON.stringify(query, null, 2).substring(1, 256);
        //console.info("Query concept observations | filter: " + displayableFilter);
        
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