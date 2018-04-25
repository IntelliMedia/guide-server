'use strict';

const parse = require('csv-parse');
const Stringx = require("../utilities/stringx");

/**
 * Convert data parsed from CSV file into objects
 */
class CsvDeserializer {
    constructor() {
        this.source = null;
    }

    _convertToObjects(source, csv, parseRowMethod) {
        this.source = source;
        var currentRowIndex = 0;
        try { 
            var rules = [];

            var headerRow = csv[0];
            var columnCount = csv[0].length;
            var columnMap = {};
            for (var i = 0; i < columnCount; ++i) {
                if (headerRow[i]) {
                    headerRow[i] = headerRow[i].trim();
                    columnMap[headerRow[i].toLowerCase()] = i;
                }
            }

            var rowCount = csv.length;
            for (var i = 1; i < rowCount; ++i) {
                // Google sheets uses 1-based counting for rows, thus add one so
                // that this number matches the Google sheets row.
                currentRowIndex = i + 1;
                //console.info("Processing row " + currentRowIndex);
                var currentRow = csv[i];

                // Empty row?
                if (!this._asText(currentRow[0])) {
                    continue;
                }

                let obj = parseRowMethod(currentRowIndex, columnMap, headerRow, currentRow);
                if (obj && obj.length > 0) {
                    rules.push.apply(rules, obj);
                }
            }

            return rules;
        } catch(err) {
            var msg = "Unable to deserialize object from '" + this.source + "' [Row: " + currentRowIndex + "] ";
            err.message = msg + err.message;
            throw err;
        }
    }

    _getColumnName(columnMap, index) {
        for (var key in columnMap) {
            if (columnMap[key] == index) {
                return key;
            }
        }

        return null;
    }

    _getCell(currentRow, columnMap, columnName, defaultValue) {
        if (!columnMap.hasOwnProperty(columnName) && columnMap[columnName] < currentRow.length) {
            throw new Error("Unable to find column named: " + columnName);
        }

        var value = currentRow[columnMap[columnName]];
        if (!value) {
            if (defaultValue != undefined) {
                value = defaultValue;
            } else {
                throw new Error("Unable to find value for column: " + columnName);
            }
        }
        return value;
    }

    _asText(value) {
        if (typeof value === "string") {
            value = value.trim();
        }
        return value;
    }

    _asNumber(value) {
        if (typeof value === "number") {
            return value;
        }
        return (value ? Number(value) : 0);
    }

    _asBoolean(value) {
        if (typeof value === "boolean") {
            return value;
        }

        if (value) {
            let normalizedValue = value.toString().toLowerCase();
            return (normalizedValue == "true" || normalizedValue == "1" || normalizedValue == "x");
        }
        
        return false;        
    }    

    // Based on [type]-[value] column naming convention, determine if the
    // column is of a specific type
    _isColumnOfType(type, columnName) {
        var target = columnName.toLowerCase();
        return target.includes(type.toLowerCase() + "-");
    }

    _extractHeadingValue(heading) {
        let value = heading.trimThroughFirst("-");
        if (!value) {
            throw new Error("Unable to extract heading value from: " + heading);
        } else {
            value = value.trim();
        }
        return value;
    }
}

module.exports = CsvDeserializer;