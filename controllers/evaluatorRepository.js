'use strict';

const rp = require('request-promise');
const parse = require('csv-parse');
const Group = require('../models/Group');
const EcdRulesEvaluator = require("./ecdRulesEvaluator");
const EcdCsvParser = require("./ecdCsvParser");

/**
 * This class retrieves rules based on group and challengeId 
 * to locate rules/hints for a specific GV2 challenge.
 */
class EvaluatorRepository {
    constructor(session) {
        this.session = session;
    }

    doesEvaluatorExistAsync(groupName, challengeId) {
        return this.getEcdRuleDocIdsAsync(groupName, challengeId, false).then((docIds) => {
            return  (docIds && docIds.length > 0 && docIds.some((item) => item == challengeId));
        })
        .catch(err => {
            return false;
        });
    }

    findEvaluatorAsync(groupName, challengeId) {
        var docUrl = null;
        return this.getEcdRuleDocIdsAsync(groupName, challengeId, true).then((docIds) => {
            let loadRulesPromises = [];
            docIds.forEach((docId) => {
                loadRulesPromises.push(this._loadRulesFromGoogleSheetAsync(docId));
            });

            return Promise.all(loadRulesPromises);
        }).then((ruleArrays) => {
            let rules = [];
            ruleArrays.forEach((array) => {
                rules = rules.concat(array);
            });
            return new EcdRulesEvaluator(rules);
        });
    }

    _loadRulesFromGoogleSheetAsync(docId) {
        var docUrl = "https://docs.google.com/spreadsheets/d/" + docId;
        var csvExportUrl = docUrl + "/export?format=csv";
        var options = {
            method: "GET",
            uri: csvExportUrl,
            headers: {
                'User-Agent': 'Request-Promise'
            } 
        };
        
        this.session.debugAlert("Load rules from: " + docUrl);
        return rp(options)
            .then( response => {
                return this.parseCsvAsync(response, docUrl);
            })
            .then (csv => {
                var parser = new EcdCsvParser();
                return parser.convertCsvToRules(docUrl, csv);
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

    // Returns as array of GoogleSheet IDs that contain ECD rules
    getEcdRuleDocIdsAsync(groupName, challengeId, includeWildcards) {
        return Group.findOne({ "name": groupName }).then((group) => {
            if (!group) {
                throw new Error("Unable to find group with name: " + groupName);
            }

            var matchingChallenges = group.challenges.filter(function(item) {
                return item.challengeId == challengeId || (includeWildcards && item.challengeId == "*");
            });
            

            if (matchingChallenges.length == 0) {
                throw new Error("Unable to find challenge id=" + challengeId + " group: " + groupName);  
            }

            console.info("Found " + matchingChallenges.length + " rule set(s) for challengeId=" + challengeId + " defined for group: " + groupName);
            return matchingChallenges.map((c) => { return c.googleEcdMatrixId; });
        });
    }
}

module.exports = EvaluatorRepository;