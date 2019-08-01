'use strict';

const CsvDeserializer = require('./csvDeserializer');

/**
 * This class parses a CSV to extract columns as a colleciton of anonymous objects
 */
class GenericCsvDeserializer extends CsvDeserializer {
    constructor(columnNames) {
        super();
        this._columnNames = columnNames;
    }
  
    parseRow(currentRowIndex, source, columnMap, headerRow, currentRow) {
        let anonObj;
        // If extracting multiple columns, create an anonymous object
        if (Array.isArray(this._columnNames) && this._columnNames.length > 1) {
            anonObj = {};
            this._columnNames.forEach(columnName => {
                anonObj[columnName] = this._getCell(currentRow, columnMap, columnName);
            });
        } else {
            // Otherwise, just return the values for the single column
            this._columnNames.forEach(columnName => {
                anonObj = this._getCell(currentRow, columnMap, columnName.toLowerCase());
            });           
        }
        return [anonObj];
    }
}

module.exports = GenericCsvDeserializer;