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
                // Google sheets uses 1-based counting for rows, thus add one so
                // that this number matches the Google sheets row.
                currentRowIndex = i + 1;
                //console.info("Processing row " + currentRowIndex);
                var currentRow = csv[i];

                // Empty row?
                if (!this.asText(currentRow[0])) {
                    continue;
                }

                rules.push.apply(rules, this.parseRow(currentRowIndex, columnMap, headerRow, currentRow));
            }

            return rules;
        } catch(err) {
            var msg = "Unable to parse CSV row " + currentRowIndex + ". ";
            err.message = msg + err.message;
            throw err;
        }
    }

    parseRow(ruleId, columnMap, headerRow, currentRow) {
        var DominantRecessiveMap = [
            { dominant: "Wings", recessive: "No wings", ":Q":":W", ":q":":w", hint: {dominant: "wing", recessive: "wing"}},
            { dominant: "Forelimbs", recessive: "No forelimbs", ":Q":":Fl", ":q":":fl", hint: {dominant: "arm", recessive: "arm"}},
            { dominant: "Hindlimbs", recessive: "No hindlimbs", ":Q":":Hl", ":q":":hl", hint: {dominant: "leg", recessive: "leg"}},
            { dominant: "Hornless", recessive: "Horns", ":Q":":H", ":q":":h", hint: {dominant: "horn", recessive: "horn"}},
            { dominant: "Metallic", recessive: "Nonmetallic", ":Q":":M", ":q":":m", hint: {dominant: "shiny", recessive: "dull"}},
            { dominant: "Color", recessive: "Albino", ":Q":":C", ":q":":c",hint: {dominant: "color", recessive: "albino"}},
            { dominant: "Gray", recessive: "Orange", ":Q":":B", ":q":":b", hint: {dominant: "gray", recessive: "orange"}}
        ];

        if (this.isDominantRecessiveRule(currentRow)) {
            var rules = [];

            DominantRecessiveMap.forEach((traitMap) => {
                var clonedRow = currentRow.slice();
                var targetCharacterisitic = clonedRow[columnMap["criteria-characteristics"]].toLowerCase();
                var isTargetTraitDominant = targetCharacterisitic === "dominant";
                var hintTarget = traitMap.hint[clonedRow[columnMap["selected-offspring-characteristics"]].toLowerCase()];
                var motherHasDominantAllele = false;
                var motherHasRecessiveAllele = false;
                var fatherHasDominantAllele = false;
                var fatherHasRecessiveAllele = false;

                for (var i = 0; i < clonedRow.length; ++i) {
                    var columnName = this.getColumnName(columnMap, i);
                     var value = clonedRow[i];
                    if (value) {                        
                        if (value.toLowerCase() === "dominant") {
                            value = traitMap.dominant;
                        } else if (value.toLowerCase() === "recessive") {
                            value = traitMap.recessive;
                        } else if (columnName.includes("mother-alleles")) {
                            motherHasDominantAllele = ((value.match(/:Q/g) || []).length > 0);
                            motherHasRecessiveAllele = ((value.match(/:q/g) || []).length > 0);
                            value = value.replace(/\:Q/g, traitMap[":Q"])
                                         .replace(/\:q/g, traitMap[":q"]);
                        } else if (columnName.includes("father-alleles")) {
                            fatherHasDominantAllele = ((value.match(/:Q/g) || []).length > 0);
                            fatherHasRecessiveAllele = ((value.match(/:q/g) || []).length > 0);
                            value = value.replace(/\:Q/g, traitMap[":Q"])
                                         .replace(/\:q/g, traitMap[":q"]);
                        }
                        clonedRow[i] = value;
                    }
                }

                var parentTarget = "";
                if (isTargetTraitDominant) {
                    if (!motherHasDominantAllele && !fatherHasDominantAllele) {
                        parentTarget = "parent";
                    } else if (!motherHasDominantAllele) {
                        parentTarget = "mother|mom";
                    } else if (!fatherHasDominantAllele) {
                        parentTarget = "father|dad";
                    } else {
                        //console.warn("Unexpected combination of dominant alleles");
                    }
                } else {
                    if (!motherHasRecessiveAllele && !fatherHasRecessiveAllele) {
                        parentTarget = "parent";
                    } else if (!motherHasRecessiveAllele) {
                        parentTarget = "mother|mom";
                    } else if (!fatherHasRecessiveAllele) {
                        parentTarget = "father|dad";
                    } else {
                        //console.warn("Unexpected combination of recessive alleles");
                    }
                }

                this.makeHintSpecificFor(hintTarget, parentTarget, headerRow, clonedRow);
                rules.push(this.createRule(ruleId, columnMap, headerRow, clonedRow));
            });
            return rules;
        } else {
            return [
                this.createRule(ruleId, columnMap, headerRow, currentRow)
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

    createRule(ruleId, columnMap, headerRow, currentRow) {
        return new EcdRule(
            ruleId, 
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