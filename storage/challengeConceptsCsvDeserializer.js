'use strict';

const ChallengeConcepts = require('../models/challengeConcepts');
const CsvDeserializer = require('./csvDeserializer');

/**
 * This class uses parses a CSV to load a mapping between challenges (sex, wings, armor, etc)
 */
class ChallengeConceptsCsvDeserializer extends CsvDeserializer {
    constructor() {
        super();
    }
  
    parseRow(currentRowIndex, source, columnMap, headerRow, currentRow) {
        return [new ChallengeConcepts(
            source,
            currentRowIndex, 
            this._getCell(currentRow, columnMap, "challengeid"),
            this._extractConcepts(headerRow, currentRow))];
    }    

    _extractConcepts(headerRow, currentRow) {
        let conceptIds = [];
         for (var i = 0; i < headerRow.length; ++i) {
            if (this._isConcept(headerRow[i])) {
                var value = currentRow[i].trim();
                if (value && this._asBoolean(value) === true) {
                    let conceptId = this._extractHeadingValue(headerRow[i]);
                    conceptIds.push(conceptId);
                }
            }
         }
         return conceptIds;
    }

    _isConcept(text) {
        return text.startsWith("LG");
    }
}

module.exports = ChallengeConceptsCsvDeserializer;