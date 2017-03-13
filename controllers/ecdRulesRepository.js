'use strict';

const rp = require('request-promise');
const parse = require('csv-parse');
const Group = require('../models/Group');

/**
 * This class retrieves rules based on group and guideId 
 * to locate rules/hints for a specific GV2 challenge.
 */
class EcdRulesRepository {
    constructor() {

    }

    findEcdMatrix(groupName, guideId) {
        return this.getEcdMatrixId(groupName, guideId).then(matrixId => {
            var options = {
                method: "GET",
                uri: "https://docs.google.com/spreadsheets/d/" + matrixId + "/export?format=csv",
                headers: {
                    'User-Agent': 'Request-Promise'
                } 
            };
            
            console.info("EcdRulesRepository GET: " + options.uri);
            return rp(options);
        })
        .then( response => {
            return this.parseCsv(response);
        })
        .catch(function (err) {
            console.error("Unable to download rules.", err);
        });
    }

    parseCsv(csv) {
        return new Promise((resolve, reject) => {
            parse(csv, {comment: '#'}, function(err, output){
                resolve(output);
            });
        });  
    }

    getEcdMatrixId(groupName, guideId) {
        return new Promise((resolve, reject) => {
            Group.findOne({ "name": groupName }, (err, group) => {
                if (err) {
                    console.error("ERROR: Can't find group: " + groupName, err);
                    throw new Error("Unable to find group with name: " + groupName);
                }

                var matchingChallenges = group.challenges.filter(function( challenge ) {
                    return challenge.guideId == guideId;
                });

                if (matchingChallenges.length > 1) {
                    console.warn("More than one challenge with id=" + guideId + " defined for group: " + groupName);
                }
                
                if (matchingChallenges.length > 0) {
                    resolve(matchingChallenges[0].googleEcdMatrixId);
                    return;
                }

                console.error("ERROR: Can't find challenge id=" + guideId + " in group: " + groupName);
                throw new Error("Unable to find  challenge id=" + guideId + " group: " + groupName);            
            });
        });
    }
}

module.exports = EcdRulesRepository;