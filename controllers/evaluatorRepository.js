'use strict';

const rp = require('request-promise');
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

    findEvaluatorAsync(groupName, tags) {
        var docUrl = null;
        return this._findAsync(groupName, tags, new RuleCsvDeserializer()).then((ruleArrays) => {
            let rules = [];
            ruleArrays.forEach((array) => {
                rules = rules.concat(array);
            });
            return (rules.length > 0 ? new EcdRulesEvaluator(rules) : null);
        });
    }
}

module.exports = EvaluatorRepository;