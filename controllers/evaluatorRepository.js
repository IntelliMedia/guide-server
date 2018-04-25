'use strict';

const fs = require('fs');
const path = require('path');
const { promisfy } = require('promisfy');
const readFileAsync = promisfy(fs.readFile);
const writeFileAsync = promisfy(fs.writeFile);
const rp = require('request-promise');
const parse = require('csv-parse');
const Group = require('../models/Group');
const EcdRulesEvaluator = require("./ecdRulesEvaluator");
const EcdCsvParser = require("./ecdCsvParser");
const Biologicax = require('../shared/biologicax');

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
                loadRulesPromises.push(this._loadRulesAsync(docId));
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

    _loadRulesAsync(docId) {

        return this._loadRulesFromFileAsync(docId)
            .catch((e) => {
                // Fallback and try to load from Google Sheet
                console.error(e.toString());
                return this._loadRulesFromGoogleSheetAsync(docId);
            });
    }    

    _loadRulesFromGoogleSheetAsync(docId) {
        var docUrl = EvaluatorRepository._getDocUrl(docId);
        var csvExportUrl = docUrl + "/export?format=csv";
        var options = {
            method: "GET",
            uri: csvExportUrl,
            headers: {
                'User-Agent': 'Request-Promise'
            } 
        };
        
        return rp(options)
            .then(response => {
                this.session.debugAlert("Loaded rules from Google Sheet: " + docUrl);
                let filepath = EvaluatorRepository._getCacheFilename(docId);
                this.session.debugAlert("Save rules to file: " + filepath);
                this._ensureDirectoryExistence(filepath);
                return writeFileAsync(filepath, response)
                .then(() => {
                    return response;
                })
                .catch(e => {
                    console.error("Unable to save CSV to cache: " + filepath);
                    return response;
                });
            })
            .then(response => {
                return this.parseCsvAsync(response, docUrl);
            })
            .then (csv => {
                var parser = new EcdCsvParser();
                return parser.convertCsvToRules(docUrl, csv);
            });
    }

    _loadRulesFromFileAsync(docId) { 
        let filepath = EvaluatorRepository._getCacheFilename(docId);        
        return readFileAsync(filepath, 'utf8')        
            .then( response => {
                this.session.debugAlert("Loaded rules from file: " + filepath);
                return this.parseCsvAsync(response, EvaluatorRepository._getDocUrl(docId));
            })
            .then (csv => {
                var parser = new EcdCsvParser();
                return parser.convertCsvToRules(EvaluatorRepository._getDocUrl(docId), csv);
            });
    }

    // https://stackoverflow.com/questions/13542667/create-directory-when-writing-to-file-in-node-js
    _ensureDirectoryExistence(filePath) {
        let dirname = path.dirname(filePath);
        if (fs.existsSync(dirname)) {
            return true;
        }
        this._ensureDirectoryExistence(dirname);
        fs.mkdirSync(dirname);
    }

    static _getDocUrl(docId) {
        return "https://docs.google.com/spreadsheets/d/" + docId;
    }
    
    static _getCacheFilename(docId) {
        return  "./ruleCache/" + docId + ".csv";
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

            // Trailing number on the challenge ID should be ignored since they
            // represent different trials of the same challenege
            challengeId = BiologicaX.getChallengeIdBase(challengeId);

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

    static clearLocalFileCache(group) {
        if (!group) {
            throw new Error("group is undefined");
        }

        for(let item of group.challenges) {
            let cacheFilename = EvaluatorRepository._getCacheFilename(item.googleEcdMatrixId);
            if (fs.existsSync(cacheFilename)) {
                console.info("Delete: " + item.googleEcdMatrixId);
                fs.unlinkSync(cacheFilename);
            }
        }
    }
}

module.exports = EvaluatorRepository;