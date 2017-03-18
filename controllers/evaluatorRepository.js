'use strict';

const rp = require('request-promise');
const parse = require('csv-parse');
const Group = require('../models/Group');
const EcdRulesEvaluator = require("./ecdRulesEvaluator");

/**
 * This class retrieves rules based on group and challengeId 
 * to locate rules/hints for a specific GV2 challenge.
 */
class EcdRulesRepository {
    constructor() {
    }

    findEvaluatorAsync(groupName, challengeId) {
        var docUrl = null;
        return this.getEcdMatrixIdAsync(groupName, challengeId).then(matrixId => {
            docUrl = "https://docs.google.com/spreadsheets/d/" + matrixId + "/export?format=csv";
            var options = {
                method: "GET",
                uri: docUrl,
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
            // TODO determine which evaluator to instantiate, don't always assume
            // ECD rules.
            return new EcdRulesEvaluator(csv);
        });
    }

    parseCsvAsync(text, docUrl) {
        return new Promise((resolve, reject) => {
            parse(text, {comment: '#'}, function(err, csv){
                if (err) {
                    reject(new Error("Unable to parse ECD rules from " + docUrl + " . " + err.message));
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

module.exports = EcdRulesRepository;