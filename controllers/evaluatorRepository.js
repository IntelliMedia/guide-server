'use strict';

const rp = require('request-promise');
const parse = require('csv-parse');
const Group = require('../models/Group');
const EcdRulesEvaluator = require("./ecdRulesEvaluator");
const RuleCsvDeserializer = require("./ruleCsvDeserializer");
const GoogleSheetRepository = require("./googleSheetRepository");

/**
 * This class load rule objects stored as CSV rows from one or more Google Sheets
 */
class EvaluatorRepository extends GoogleSheetRepository {
    constructor(session) {
        super(session);
    }

    findEvaluatorAsync(groupName, challengeId) {
        var docUrl = null;
        return this._findAsync(groupName, challengeId, new RuleCsvDeserializer()).then((ruleArrays) => {
            let rules = [];
            ruleArrays.forEach((array) => {
                rules = rules.concat(array);
            });
            return new EcdRulesEvaluator(rules);
        });
    }
}

module.exports = EvaluatorRepository;