'use strict';

const _ = require('lodash');
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

    doesMatchExistAsync(groupName, tags) {
        return this._getGoogleSheetIdsAsync(groupName, tags, false).then((docIds) => {
            return  (docIds && docIds.length > 0 && docIds.some((item) => item == tags));
        })
        .catch(err => {
            return false;
        });
    }

    // Returns array of objects parsed from one or more sheets
    _findAsync(groupName, tags, csvParser) {
        var docUrl = null;
        return this._getGoogleSheetIdsAsync(groupName, tags, true).then((docIds) => {
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
                } else {
                    resolve(csv);
                }
            });
        });  
    }

    // Returns as array of GoogleSheet IDs that contain ECD rules
    _getGoogleSheetIdsAsync(groupName, tags, includeWildcards) {
        return Group.findOne({ "name": groupName }).then((group) => {
            if (!group) {
                throw new Error("Unable to find group with name: " + groupName);
            }

            // The tags associated with the Google Sheet to be loaded
            let targetTags = tags.splitAndTrim(",");

            var matchingRepositoryLinks = group.repositoryLinks.filter(function(item) {
                let repoTags = item.tags.splitAndTrim(",");
                return _.difference(targetTags, repoTags).length === 0;
            }); 

            if (matchingRepositoryLinks.length == 0) {
                this.session.warningAlert("Unable to find Google Sheet with tags (" + tags + ") in  group '" + groupName + "'");  
                return [];
            }

            console.info("Found " + matchingRepositoryLinks.length + " Google Sheets for tags (" + tags + ") defined for group '" + groupName + "'");
            return matchingRepositoryLinks.map((c) => { return c.googleSheetDocId; });
        });
    }
}

module.exports = GoogleSheetRepository;