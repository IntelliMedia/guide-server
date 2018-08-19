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
            this._asNumber(this._getCell(currentRow, columnMap, "attribute")),
            this._asNumber(this._getCell(currentRow, columnMap, "target")),
            this._extractConcepts(headerRow, currentRow))];
    }    

    _extract_extractConceptsHints(headerRow, currentRow) {
        var hints = [];
         for (var i = 0; i < headerRow.length; ++i) {
            if (this._isHint(headerRow[i])) {
                var value = currentRow[i].trim();
                if (value) {
                    hints.push(value);
                }
            }
         }
         return hints;
    }

    _isConcept(text) {
        return text.startsWith("LG");
    }
}

module.exports = AttributeConceptsCsvDeserializer;