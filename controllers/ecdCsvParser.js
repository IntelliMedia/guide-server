'use strict';

const parse = require('csv-parse');
const EcdRule = require('./ecdRule');
const EcdRuleCondition = require('./ecdRuleCondition');
const Stringx = require("../utilities/stringx");


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

                rules.push.apply(rules, this.parseRow(columnMap, headerRow, currentRow));
            }

            return rules;
        } catch(err) {
            var msg = "Unable to parse CSV row " + currentRowIndex + ". ";
            err.message = msg + err.message;
            throw err;
        }
    }

    parseRow(columnMap, headerRow, currentRow) {
        var DominantRecessiveMap = [
            { dominant: "Wings", recessive: "No wings", ":Q":":W", ":q":":w", hintTarget: "wing"},
            { dominant: "Forelimbs", recessive: "No forelimbs", ":Q":":Fl", ":q":":fl", hintTarget: "arm"},
            { dominant: "Hindlimbs", recessive: "No hindlimbs", ":Q":":Hl", ":q":":hl", hintTarget: "leg"},
            { dominant: "Hornless", recessive: "Horns", ":Q":":H", ":q":":h", hintTarget: "horn"},
            { dominant: "Metallic", recessive: "Dull", ":Q":":M", ":q":":m", hintTarget: "shin|dull"},
            { dominant: "Color", recessive: "Albino", ":Q":":C", ":q":":c", hintTarget: "color|albino"},
            { dominant: "Gray", recessive: "Orange", ":Q":":B", ":q":":b", hintTarget: "gray|orange"}
        ];

        if (this.isDominantRecessiveRule(currentRow)) {
            console.info("Found generic rule");
            var rules = [];
            DominantRecessiveMap.forEach((traitMap) => {
                var clonedRow = currentRow.slice();
                var parentRegexWithOnlyRecessiveAllele = "parent";
                for (var i = 0; i < clonedRow.length; ++i) {
                    var columnName = this.getColumnName(columnMap, i);
                    var value = clonedRow[i];
                    var motherHasDominantAllele = false;
                    var fatherHasDominantAllele = false;
                    if (value) {                        
                        if (value.toLowerCase() === "dominant") {
                            value = traitMap.dominant;
                        } else if (value.toLowerCase() === "recessive") {
                            value = traitMap.recessive;
                        } else if (columnName.includes("mother-alleles")) {
                            motherHasDominantAllele = ((value.match(/:Q/g) || []).length > 0);
                            value = value.replace(/\:Q/g, traitMap[":Q"])
                                         .replace(/\:q/g, traitMap[":q"]);
                        } else if (columnName.includes("father-alleles")) {
                            fatherHasDominantAllele = ((value.match(/:Q/g) || []).length > 0);
                            value = value.replace(/\:Q/g, traitMap[":Q"])
                                         .replace(/\:q/g, traitMap[":q"]);
                        }

                        if (motherHasDominantAllele && fatherHasDominantAllele) {
                            parentRegexWithOnlyRecessiveAllele = "parent";
                        } else if (motherHasDominantAllele) {
                            parentRegexWithOnlyRecessiveAllele = "mother|mom";
                        } else if (fatherHasDominantAllele) {
                            parentRegexWithOnlyRecessiveAllele = "father|dad";
                        }

                        clonedRow[i] = value;
                    }
                }
                this.makeHintSpecificFor(traitMap.hintTarget, parentRegexWithOnlyRecessiveAllele, headerRow, clonedRow);
                rules.push(this.createRule(columnMap, headerRow, clonedRow));
            });
            return rules;
        } else {
            return [
                this.createRule(columnMap, headerRow, currentRow)
            ];
        }
    }

    getColumnName(columnMap, index) {
        for (var key in columnMap) {
            if (columnMap[key] == index) {
                return key;
            }
        }

        return null;
    }

    createRule(columnMap, headerRow, currentRow) {
        return new EcdRule(
            this.asNumber(this.getCell(currentRow, columnMap, "priority")),
            this.extractConditions("criteria", headerRow, currentRow),
            this.extractConditions("selected", headerRow, currentRow),
            this.extractConcepts(headerRow, currentRow),
            this.extractHints(headerRow, currentRow));
    }

    isDominantRecessiveRule(row) {
        for (var i = 0; i < row.length; ++i) {
            var value = row[i];
            if (value) {
                value = value.toLowerCase();
                if (value === "dominant" || value === "recessive") {
                    return true;
                }
            }
        }

        return false;
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
        var value = heading.trimThroughFirst("-");
        if (!value) {
            throw new Error("Unable to extract heading value from: " + heading);
        }
        return value;
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

    makeHintSpecificFor(target, parentRegex, headerRow, currentRow) {
        var findReplacementBlock = new RegExp("\\[[^\\]]*\\]", "i");
        var findReplacementWord = new RegExp("([^,\\[]*" + target + "[^,\\]]*)", "i");
        var findReplacementParent = new RegExp("([^,\\[]*" + parentRegex + "[^,\\]]*)", "i");

        var hints = [];
         for (var i = 0; i < headerRow.length; ++i) {
            if (this.isHint(headerRow[i])) {
                var value = currentRow[i].trim();
                do {
                    var replacementBlock = value.match(findReplacementBlock);
                    if (replacementBlock != null) {
                        var wordMatches = replacementBlock[0].match(findReplacementWord);
                        if (wordMatches == null) {
                            wordMatches = replacementBlock[0].match(findReplacementParent);
                        }
                        if (wordMatches != null) {
                            value = value.replace(replacementBlock[0], wordMatches[0].trim());
                        } else {
                            value = value.replace(replacementBlock[0], "???");
                        }
                    }
                } while (replacementBlock != null);
                currentRow[i] = value.upperCaseFirstChar();
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