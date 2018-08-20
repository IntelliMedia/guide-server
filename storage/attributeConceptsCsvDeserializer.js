'use strict';

const AttributeConcepts = require('../models/attributeConcepts');
const CsvDeserializer = require('./csvDeserializer');

/**
 * This class uses parses a CSV to load a mapping between attributes (sex, wings, armor, etc)
 */
class AttributeConceptsCsvDeserializer extends CsvDeserializer {
    constructor() {
        super();
    }
  
    parseRow(currentRowIndex, source, columnMap, headerRow, currentRow) {
        return [new AttributeConcepts(
            source,
            currentRowIndex, 
            this._getCell(currentRow, columnMap, "attribute"),
            this._getCell(currentRow, columnMap, "target"),
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

module.exports = AttributeConceptsCsvDeserializer;