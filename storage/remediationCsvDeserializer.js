'use strict';

const Remediation = require('../models/remediation');
const CsvDeserializer = require('./csvDeserializer');

/**
 * This class uses parses a CSV to extract remediation actions
 * to be taken when a concept probabilityLearned drops below a threshold.
 */
class RemediationCsvDeserializer extends CsvDeserializer {
    constructor() {
        super();
    }
  
    parseRow(currentRowIndex, source, columnMap, headerRow, currentRow) {
        return [new Remediation(
            source,
            currentRowIndex, 
            this._asNumber(this._getCell(currentRow, columnMap, "priority")),
            this._getCell(currentRow, columnMap, "conceptid"),
            this._asNumber(this._getCell(currentRow, columnMap, "minimumattempts")),
            this._asNumber(this._getCell(currentRow, columnMap, "probabilitylearnedthreshold")),
            this._getCell(currentRow, columnMap, "challengetype"),
            this._getCell(currentRow, columnMap, "practicecriteria")
            )];
    }
}

module.exports = RemediationCsvDeserializer;