'use strict';

const parse = require('csv-parse');
const EcdRule = require('./ecdRule');
const EcdRuleCondition = require('./ecdRuleCondition');


/**
 * This class uses parses a CSV to create ECD-based rules
 * used to update a student model
 */
class EcdCsvParser {
    constructor() {
    }

    convertCsvToRules(csv) {
        var currentRowIndex = 0;
        try { 
            var rules = [];

            var headerRow = csv[0];
            var columnCount = csv[0].length;
            var columnMap = {};
            for (var i = 0; i < columnCount; ++i) {
                columnMap[headerRow[i].toLowerCase().trim()] = i;
            }

            var rowCount = csv.length;
            for (var i = 1; i < rowCount; ++i) {
                currentRowIndex = i;
                var currentRow = csv[i];

                // Empty row?
                if (!this.asText(currentRow[0])) {
                    continue;
                }

                rules.push(new EcdRule(
                    this.asNumber(this.getCell(currentRow, columnMap, "priority")),
                    this.extractConditions("criteria", headerRow, currentRow),
                    this.extractConditions("selected", headerRow, currentRow),
                    this.extractConcepts(headerRow, currentRow),
                    this.extractHints(headerRow, currentRow)));
            }

            return rules;
        } catch(err) {
            var msg = "Unable to parse CSV row " + currentRowIndex + ". ";
            err.message = msg + err.message;
            throw err;
        }
    }

    getCell(currentRow, columnMap, columnName) {
        if (!columnMap.hasOwnProperty(columnName) && columnMap[columnName] < currentRow.length) {
            throw new Error("Unable to find column named: " + columnName);
        }

        var value = currentRow[columnMap[columnName]];
        if (!value) {
            throw new Error("Unable to find value for column: " + columnName);
        }
        return value;
    }

    asText(value) {
        if (typeof value === "string") {
            value = value.trim();
        }
        return value;
    }

    asNumber(value) {
        if (typeof value === "number") {
            return value;
        }
        return (value ? Number(value) : 0);
    }

    extractHeadingValue(heading) {
        var words = heading.trim().split("-");
        if (words == null || words.length < 2) {
            throw new Error("Unable to extract heading value from: " + heading);
        }
        return words[1];
    }

    extractConditions(prefix, headerRow, currentRow) {
        var conditions = [];
         for (var i = 0; i < headerRow.length; ++i) {
            if (this.isCondition(prefix, headerRow[i])) {
                var targetValue = currentRow[i].trim();
                if (targetValue) {
                    var conditionType = this.extractHeadingValue(headerRow[i]);
                    conditions.push(EcdRuleCondition.create(conditionType, targetValue));
                }
            }
         }

         if (conditions.length == 0) {
             throw new Error("Missing conditions in CSV. Unable to find columns with '{0}' prefix.".replace("{0}", prefix));
         }
         return conditions;
    }

    extractConcepts(headerRow, currentRow) {
        var concepts = {};
         for (var i = 0; i < headerRow.length; ++i) {
            if (this.isConceptId(headerRow[i])) {
                var value = currentRow[i].trim();
                if (value) {
                    var conceptId = this.extractHeadingValue(headerRow[i]);
                    concepts[conceptId] = this.asNumber(value);
                }
            }
         }
         return concepts;
    }

    extractHints(headerRow, currentRow) {
        var hints = [];
         for (var i = 0; i < headerRow.length; ++i) {
            if (this.isHint(headerRow[i])) {
                var value = currentRow[i].trim();
                if (value) {
                    hints.push(value);
                }
            }
         }
         return hints;
    }

    isCondition(prefix, text) {
        var target = text.toLowerCase();
        return target.includes(prefix.toLowerCase() + "-");
    }

    isConceptId(text) {
        var target = text.toLowerCase();
        return target.includes("concept-");
    }

    isHint(text) {
        var target = text.toLowerCase();
        return target.includes("hint-");
    }
}

module.exports = EcdCsvParser;