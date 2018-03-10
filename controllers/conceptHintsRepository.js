'use strict';

const ConceptHintsCsvDeserializer = require("./conceptHintsCsvDeserializer");

/**
 * This class load rule objects stored as CSV rows from one or more Google Sheets
 */
class ConceptHintsRepository extends GoogleSheetRepository {
    constructor(session) {
        super(session);
    }

    findEvaluatorAsync(groupName, tags) {
        var docUrl = null;
        return this._findAsync(groupName, tags, new ConceptHintsCsvDeserializer()).then((ruleArrays) => {
            let rules = [];
            ruleArrays.forEach((array) => {
                rules = rules.concat(array);
            });
            return new EcdRulesEvaluator(rules);
        });
    }
}

module.exports = ConceptHintsRepository;