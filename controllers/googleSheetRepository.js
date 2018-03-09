'use strict';

const rp = require('request-promise');
const parse = require('csv-parse');
const Group = require('../models/Group');

/**
 * This class retrieves data from a Google Sheet
 */
class GoogleSheetRepository {
    constructor(session) {
        this.session = session;
    }

    doesMatchExistAsync(groupName, challengeId) {
        return this._getGoogleSheetIdsAsync(groupName, challengeId, false).then((docIds) => {
            return  (docIds && docIds.length > 0 && docIds.some((item) => item == challengeId));
        })
        .catch(err => {
            return false;
        });
    }

    // Returns array of objects parsed from one or more sheets
    _findAsync(groupName, challengeId, csvParser) {
        var docUrl = null;
        return this._getGoogleSheetIdsAsync(groupName, challengeId, true).then((docIds) => {
            let loadPromises = [];
            docIds.forEach((docId) => {
                loadPromises.push(this._loadFromGoogleSheetAsync(docId, csvParser));
            });

            return Promise.all(loadPromises);
        });
    }

    _loadFromGoogleSheetAsync(docId, csvParser) {
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
                return this._parseCsvAsync(response, docUrl);
            })
            .then (csv => {
                return csvParser.convertToObjects(docUrl, csv);
            });
    }

    _parseCsvAsync(text, docUrl) {
        return new Promise((resolve, reject) => {
            var parseOptions = {
                comment: '#',
                skip_empty_lines: true
            };
            parse(text, parseOptions, function(err, csv){
                if (err) {
                    var msg = "Unable to parse " + docUrl + " . ";
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
    _getGoogleSheetIdsAsync(groupName, challengeId, includeWildcards) {
        return Group.findOne({ "name": groupName }).then((group) => {
            if (!group) {
                throw new Error("Unable to find group with name: " + groupName);
            }

            // Trailing number on the challenge ID should be ignored since they
            // represent different trials of the same challenege
            challengeId = challengeId.replace(/-?\d*$/,"");

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

module.exports = GoogleSheetRepository;