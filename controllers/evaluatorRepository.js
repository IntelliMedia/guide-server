'use strict';

const rp = require('request-promise');
const parse = require('csv-parse');
const Group = require('../models/Group');
const EcdRulesEvaluator = require("./ecdRulesEvaluator");

/**
 * This class retrieves rules based on group and challengeId 
 * to locate rules/hints for a specific GV2 challenge.
 */
class EvaluatorRepository {
    constructor() {
    }

    doesEvaluatorExistAsync(groupName, challengeId) {
        var docUrl = null;
        return this.getEcdMatrixIdAsync(groupName, challengeId).then(matrixId => {
            docUrl = "https://docs.google.com/spreadsheets/d/" + matrixId;
            var csvExportUrl = docUrl + "/export?format=csv";
            var options = {
                method: "GET",
                uri: csvExportUrl,
                headers: {
                    'User-Agent': 'Request-Promise'
                } 
            };
            
            console.info("EcdRulesRepository GET: " + options.uri);
            return rp(options);
        })
        .catch(err => {
            return false;
        })
        .then( response => {
            if (response) {
                return this.parseCsvAsync(response, docUrl);
            } else {
                return false;
            }
        })
        .catch(err => {
            return false;
        })
        .then (csv => {
            return csv.constructor === Array && csv.length > 0;
        });
    }

    findEvaluatorAsync(groupName, challengeId) {
        var docUrl = null;
        return this.getEcdMatrixIdAsync(groupName, challengeId).then(matrixId => {
            docUrl = "https://docs.google.com/spreadsheets/d/" + matrixId;
            var csvExportUrl = docUrl + "/export?format=csv";
            var options = {
                method: "GET",
                uri: csvExportUrl,
                headers: {
                    'User-Agent': 'Request-Promise'
                } 
            };
            
            console.info("EcdRulesRepository GET: " + options.uri);
            return rp(options);
        })
        .then( response => {
            return this.parseCsvAsync(response, docUrl);
        })
        .then (csv => {
            // TODO determine which condition to instantiate, don't always assume
            // ECD rules.
            try {
                return new EcdRulesEvaluator(docUrl, csv);
            } catch(err) {
                var msg = "Unable to parse '" + docUrl + "'. ";
                err.message = msg + err.message;
                throw err;
            }
        });
    }

    parseCsvAsync(text, docUrl) {
        return new Promise((resolve, reject) => {
            var parseOptions = {
                comment: '#',
                skip_empty_lines: true
            };
            parse(text, parseOptions, function(err, csv){
                if (err) {
                    var msg = "Unable to parse ECD rules from " + docUrl + " . ";
                    if (text.includes("Create a new spreadsheet and edit with others at the same time")) {
                        msg += "Unable to access Google spreadsheet. Change sharing options to allow 'anyone with the link' to view the spreadsheet.";
                    } else {
                        msg += err.message;
                    }
                    reject(new Error(msg));
                }
                resolve(csv);
            });
        });  
    }

    getEcdMatrixIdAsync(groupName, challengeId) {
        return Group.findOne({ "name": groupName }).then((group) => {
            if (!group) {
                throw new Error("Unable to find group with name: " + groupName);
            }

            var matchingChallenges = group.challenges.filter(function( challenge ) {
                return challenge.challengeId == challengeId;
            });

            if (matchingChallenges.length > 1) {
                console.warn("More than one challenge with id=" + challengeId + " defined for group: " + groupName);
            }
            
            if (matchingChallenges.length > 0) {
                return matchingChallenges[0].googleEcdMatrixId;
            }

            throw new Error("Unable to find  challenge id=" + challengeId + " group: " + groupName);      
        });
    }
}

module.exports = EvaluatorRepository;