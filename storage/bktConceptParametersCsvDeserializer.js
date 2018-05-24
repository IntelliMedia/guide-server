'use strict';

const BKTConceptParameters = require('../models/bktConceptParameters');
const CsvDeserializer = require('./csvDeserializer');

/**
 * This class parses a CSV to extract BKT parameters for a specific concept
 */
class BKTConceptParametersCsvDeserializer extends CsvDeserializer {
    constructor() {
        super();
    }
  
    parseRow(currentRowIndex, source, columnMap, headerRow, currentRow) {
        return [new BKTConceptParameters(
            source,
            currentRowIndex, 
            this._getCell(currentRow, columnMap, "conceptid"),
            this._asNumber(this._getCell(currentRow, columnMap, "l0")),
            this._asNumber(this._getCell(currentRow, columnMap, "g")),
            this._getCell(currentRow, columnMap, "s"),
            this._getCell(currentRow, columnMap, "t")
            )];
    }
}

module.exports = BKTConceptParametersCsvDeserializer;