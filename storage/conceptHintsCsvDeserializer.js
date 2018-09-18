'use strict';

const ConceptHints = require('../models/conceptHints');
const CsvDeserializer = require('./csvDeserializer');

/**
 * This class uses parses a CSV to create ECD-based rules
 * used to update a student model
 */
class ConceptHintsCsvDeserializer extends CsvDeserializer {
    constructor() {
        super();
    }

    parseRow(currentRowIndex, source, columnMap, headerRow, currentRow) {
        return [new ConceptHints(
            source,
            currentRowIndex,
            this._asNumber(this._getCell(currentRow, columnMap, "priority")),
            this._getCell(currentRow, columnMap, "conceptid"),
            this._asNumber(this._getCell(currentRow, columnMap, "minimumattempts")),
            this._asNumber(this._getCell(currentRow, columnMap, "probabilitylearnedthreshold")),
            this._getCell(currentRow, columnMap, "tags"),
            this._extractHints(headerRow, currentRow))];
    }

    _extractHints(headerRow, currentRow) {
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

    _isHint(text) {
        return this._isColumnOfType("hint", text);
    }
}

module.exports = ConceptHintsCsvDeserializer;