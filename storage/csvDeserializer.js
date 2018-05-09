'use strict';

const parse = require('csv-parse');
const Stringx = require("../utilities/stringx");

/**
 * Convert data parsed from CSV file into objects
 */
class CsvDeserializer {
    // this._parseRuleRow.bind(this)
    constructor() {
    }

    convertToObjectsAsync(data, source) {
        return this._parseCsvAsync(data)
            .then ((csv) => {
                return this._convertToObjects(csv, source);
            });
    }
    
    fileType() {
        return "csv";
    }

    parseRow(currentRowIndex, source, columnMap, headerRow, currentRow) {
        throw new Error("This method must be overridden in inherited class");
    }

    _parseCsvAsync(text) {
        return new Promise((resolve, reject) => {
            var parseOptions = {
   //             comment: '#',
   //             skip_empty_lines: true
            };
            parse(text, parseOptions, function(err, csv){
                if (err) {
                    reject(new Error("Unable to parse CSV. " + err));
                } else {
                    resolve(csv);
                }
            });
        }); 
    }

    _convertToObjects(csv, source) {
        var currentRowIndex = 0;
        try { 
            var rules = [];

            currentRowIndex = CsvDeserializer._skipCommentOrEmptyRows(csv, currentRowIndex);

            var headerRow = csv[currentRowIndex];
            var columnCount = csv[currentRowIndex].length;
            var columnMap = {};
            for (let i = 0; i < columnCount; ++i) {
                if (headerRow[i]) {
                    headerRow[i] = headerRow[i].trim();
                    columnMap[headerRow[i].toLowerCase()] = i;
                }
            }

            var rowCount = csv.length;
            // Move to next non-comment/non-empty row
            currentRowIndex = CsvDeserializer._skipCommentOrEmptyRows(csv, currentRowIndex + 1);
            while (currentRowIndex < rowCount) {
                let currentRow = csv[currentRowIndex];

                // Google sheets uses 1-based counting for rows, thus add one so
                // that this number matches the Google sheets row.
                let obj = this.parseRow(currentRowIndex + 1, source, columnMap, headerRow, currentRow);
                if (obj && obj.length > 0) {
                    rules.push.apply(rules, obj);
                }

                // Move to next non-comment/non-empty row
                currentRowIndex = CsvDeserializer._skipCommentOrEmptyRows(csv, currentRowIndex + 1);
            }

            return rules;
        } catch(err) {
            var msg = "Unable to deserialize object from '" + source + "' [Row: " + (currentRowIndex + 1) + "] ";
            err.message = msg + err.message;
            throw err;
        }
    }

    static _skipCommentOrEmptyRows(csv, currentIndex) {
        while (currentIndex < csv.length) {
            if (csv[currentIndex].length > 0 
                && csv[currentIndex][0].length > 0
                && csv[currentIndex][0][0] != '#') {
                break;
            }
            ++currentIndex;
        }

        return currentIndex;
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