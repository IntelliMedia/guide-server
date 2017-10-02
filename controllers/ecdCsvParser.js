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
        this.source = null;
    }

    convertCsvToRules(source, csv) {
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
                if (!this.asText(currentRow[0])) {
                    continue;
                }

                rules.push.apply(rules, this.parseRow(currentRowIndex, columnMap, headerRow, currentRow));
            }

            return rules;
        } catch(err) {
            var msg = "Unable to parse '" + this.source + "' - Row: " + currentRowIndex;
            err.message = msg + err.message;
            throw err;
        }
    }

    parseRow(ruleId, columnMap, headerRow, currentRow) {
        var DominantRecessiveMap = [
            { dominant: "Wings", recessive: "No wings", ":Q":":W", ":q":":w", characterisiticName: {dominant: "wings", recessive: "wingless"}},
            { dominant: "Forelimbs", recessive: "No forelimbs", ":Q":":Fl", ":q":":fl", characterisiticName: {dominant: "arms", recessive: "armless"}},
            { dominant: "Hindlimbs", recessive: "No hindlimbs", ":Q":":Hl", ":q":":hl", characterisiticName: {dominant: "legs", recessive: "legless"}},
            { dominant: "Hornless", recessive: "Horns", ":Q":":H", ":q":":h", characterisiticName: {dominant: "hornless", recessive: "horns"}},
            { dominant: "Metallic", recessive: "Nonmetallic", ":Q":":M", ":q":":m", characterisiticName: {dominant: "shiny", recessive: "dull"}},
            { dominant: "Color", recessive: "Albino", ":Q":":C", ":q":":c", characterisiticName: {dominant: "color", recessive: "albino"}},
            { dominant: "Gray", recessive: "Orange", ":Q":":B", ":q":":b", characterisiticName: {dominant: "gray", recessive: "orange"}}
        ];

        if (this.isDominantRecessiveRule(currentRow)) {
            var rules = [];

            DominantRecessiveMap.forEach((traitMap) => {
                var clonedRow = currentRow.slice();
                var targetCharacterisitic = clonedRow[columnMap["criteria-characteristics"]].toLowerCase();
                var isTargetTraitDominant = targetCharacterisitic === "dominant";
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


                var substitutionSelectorMap = {};

                if (isTargetTraitDominant) {
                    substitutionSelectorMap = {
                        incorrectTrait: traitMap.characterisiticName.recessive,
                        correctTrait: traitMap.characterisiticName.dominant
                    };

                    if (!motherHasDominantAllele && !fatherHasDominantAllele) {
                        substitutionSelectorMap.incorrectParent = "parent";
                    } else if (!motherHasDominantAllele) {
                        substitutionSelectorMap.incorrectParent = "mother|mom";
                    } else if (!fatherHasDominantAllele) {
                        substitutionSelectorMap.incorrectParent = "father|dad";
                    } else {
                        //console.warn("Unexpected combination of dominant alleles");
                    }
                } else {
                    substitutionSelectorMap = {
                        incorrectTrait: traitMap.characterisiticName.dominant,
                        correctTrait: traitMap.characterisiticName.recessive
                    };

                    if (!motherHasRecessiveAllele && !fatherHasRecessiveAllele) {
                        substitutionSelectorMap.incorrectParent = "parent";
                    } else if (!motherHasRecessiveAllele) {
                        substitutionSelectorMap.incorrectParent = "mother|mom";
                    } else if (!fatherHasRecessiveAllele) {
                        substitutionSelectorMap.incorrectParent = "father|dad";
                    } else {
                        //console.warn("Unexpected combination of recessive alleles");
                    }
                }

                this.makeHintSpecificFor(substitutionSelectorMap, headerRow, clonedRow);
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
        var conditions = [];
        conditions = conditions.concat(this.extractConditions("context.challengeCriteria", "criteria", headerRow, currentRow));
        conditions = conditions.concat(this.extractConditions("context.userSelections","selected", headerRow, currentRow));
        conditions = conditions.concat(this.extractConditions("context","condition", headerRow, currentRow));

        if (conditions.length == 0) {
            throw new Error("Missing conditions in CSV. Unable to find columns with condition prefixes: Criteria-, Selected-, or Condition-");
        }

        return new EcdRule(
            this.source,
            ruleId, 
            this.asNumber(this.getCell(currentRow, columnMap, "priority")),
            conditions,
            this.extractConcepts(headerRow, currentRow),
            this.extractHints(headerRow, currentRow));
    }

    isDominantRecessiveRule(row) {
        for (var i = 0; i < row.length; ++i) {
            var value = row[i];
            if (value) {
                value = value.trim().toLowerCase();
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
        let value = heading.trimThroughFirst("-");
        if (!value) {
            throw new Error("Unable to extract heading value from: " + heading);
        } else {
            value = value.trim();
        }
        return value;
    }

    extractConditions(basePropertyPath, prefix, headerRow, currentRow) {
        let conditions = [];
         for (let i = 0; i < headerRow.length; ++i) {
            if (this.isCondition(prefix, headerRow[i])) {
                let targetValue = currentRow[i].trim();
                if (targetValue) {
                    let columnName = headerRow[i];
                    let ruleType = this.extractRuleTypeFromColumnName(columnName);
                    let propertyPath = basePropertyPath + "." + this.extractProprtyPathFromColumnName(columnName);
                    conditions.push(this.createCondition(ruleType, targetValue, propertyPath));
                }
            }
         }

         return conditions;
    }

    // Assume last word specifies the type of rule
    // E.g., Criteria-Sex -> Sex
    extractRuleTypeFromColumnName(columnName) {
        var words = columnName.split("-");
        return words[words.length - 1];
    }

    // Assume last word specifies the type of rule
        // E.g., Selected-Offspring-Sex -> offspringSex
    extractProprtyPathFromColumnName(columnName) {
        let value = columnName.trimThroughFirst("-");
        value = value.replace("-", "");
        return value.lowerCaseFirstChar();
    }

    createCondition(type, value, propertyPath) {
        // The last word indicates the type of condition (e.g., sex or characteristics)
        let condition = null;
        switch(type.toLowerCase()) {

            case "alleles":
                condition = new EcdRuleCondition.AllelesCondition(propertyPath, value);
                break;

            case "sex":
                condition = new EcdRuleCondition.SexCondition(propertyPath, value);
                break;

            case "characteristics":
                condition = new EcdRuleCondition.CharacteristicsCondition(propertyPath, value);
                break;

            case "challengeid":
                condition = new EcdRuleCondition.StringCondition(propertyPath, value, true);
                break;

            case "correct":
                condition = new EcdRuleCondition.BoolCondition(propertyPath, value);
                break;

            default:
                throw new Error("Unknown EcdRuleCondition type: " + type);
        }

        return condition;
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

    makeHintSpecificFor(selectorMap, headerRow, currentRow) {
        var findReplacementBlock = new RegExp("\\[(?:([^\\]\\:]+)\\:)?([^\\]]*)\\]", "i");

        var hints = [];
         for (var i = 0; i < headerRow.length; ++i) {
            if (this.isHint(headerRow[i])) {
                var value = currentRow[i].trim();
                do {
                    var replacementBlock = value.match(findReplacementBlock);
                    if (replacementBlock != null) {
                        var block = replacementBlock[0];
                        var selector = (replacementBlock[1] ? replacementBlock[1] : "selector?");
                        var phrases = (replacementBlock[2] ? replacementBlock[2] : "phrases?");

                        var substitutionPhrase = selector;
                        if (selectorMap.hasOwnProperty(selector)) {
                            var phraseRegex = selectorMap[selector];
                            var findPhrase = new RegExp("([^,\\[]*" + phraseRegex + "[^,\\]]*)", "i");
                            var phraseMatch = phrases.match(findPhrase);
                            if (phraseMatch != null) {
                                substitutionPhrase = phraseMatch[0];
                            } else {
                                substitutionPhrase = "[" + phraseRegex + "?]";
                            }
                        }

                        value = value.replace(block, substitutionPhrase.trim());
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