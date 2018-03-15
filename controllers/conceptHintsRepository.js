'use strict';

const ConceptHintsCsvDeserializer = require("./conceptHintsCsvDeserializer");
const GoogleSheetRepository = require("./googleSheetRepository");
const _ = require('lodash');

/**
 * This class load rule objects stored as CSV rows from one or more Google Sheets
 */
class ConceptHintsRepository extends GoogleSheetRepository {
    constructor(session) {
        super(session);
        this.conceptHints = null;
    }

    loadAsync(groupName) {
        return this._findAsync(groupName, "hints", new ConceptHintsCsvDeserializer()).then((hintArrays) => {
            let loadedHints = [];
            hintArrays.forEach((array) => {
                loadedHints = loadedHints.concat(array);
            });
            this.conceptHints = loadedHints;
        });
    }

    find(tags, conceptId) {
        if (this.conceptHints == null) {
            throw new Error("Repository not initialized.");
        }

        let targetTags = tags.splitAndTrim(",");
        return this.conceptHints.filter((conceptHint) => {
            let conceptHintTags = conceptHint.tags.splitAndTrim(",");
            return conceptHint.conceptId == conceptId 
                && _.difference(targetTags, conceptHintTags).length === 0;            
        });
    }
}

module.exports = ConceptHintsRepository;