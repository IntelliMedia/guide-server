'use strict';

const Rule = require('../models/rule');
const RuleCondition = require('../models/ruleCondition');
const CsvDeserializer = require('./csvDeserializer');
const Stringx = require('../utilities/stringx');

/**
 * This class uses parses a CSV to create ECD-based rules
 * used to update a student model
 */
class RuleCsvDeserializer extends CsvDeserializer {
    constructor() {
        super();
    }

    convertToObjects(source, csv) {
        return this._convertToObjects(source, csv, this._parseRuleRow.bind(this));
    }
  
    _parseRuleRow(ruleId, columnMap, headerRow, currentRow) {
        var DominantRecessiveMap = [
            { dominant: "Wings", recessive: "No wings", ":Q":":W", ":q":":w", characterisiticName: {dominant: "wings", recessive: "wingless"}},
            { dominant: "Forelimbs", recessive: "No forelimbs", ":Q":":Fl", ":q":":fl", characterisiticName: {dominant: "arms", recessive: "armless"}},
            { dominant: "Hindlimbs", recessive: "No hindlimbs", ":Q":":Hl", ":q":":hl", characterisiticName: {dominant: "legs", recessive: "legless"}},
            { dominant: "Hornless", recessive: "Horns", ":Q":":H", ":q":":h", characterisiticName: {dominant: "hornless", recessive: "horns"}},
            { dominant: "Metallic", recessive: "Nonmetallic", ":Q":":M", ":q":":m", characterisiticName: {dominant: "shiny", recessive: "dull"}},
            { dominant: "Color", recessive: "Albino", ":Q":":C", ":q":":c", characterisiticName: {dominant: "color", recessive: "albino"}},
            { dominant: "Gray", recessive: "Orange", ":Q":":B", ":q":":b", characterisiticName: {dominant: "gray", recessive: "orange"}}
        ];

        if (this._isDominantRecessiveRule(currentRow)) {
            var rules = [];

            DominantRecessiveMap.forEach((traitMap) => {
                var clonedRow = currentRow.slice();
                var targetCharacterisitic = this._getTraitTarget(traitMap, clonedRow, columnMap, headerRow);
                var isTargetTraitDominant = targetCharacterisitic === "dominant";
                var motherHasDominantAllele = false;
                var motherHasRecessiveAllele = false;
                var fatherHasDominantAllele = false;
                var fatherHasRecessiveAllele = false;

                for (var i = 0; i < clonedRow.length; ++i) {
                    var columnName = this._getColumnName(columnMap, i);
                    var value = clonedRow[i];
                    if (!value) {
                        continue;
                    }

                    if (columnName.includes("trait")) {
                        if (value.toLowerCase() === "dominant") {
                            value = traitMap.dominant;
                        } else if (value.toLowerCase() === "recessive") {
                            value = traitMap.recessive;
                        } else {
                            // Don't change the value since it is a specific trait
                        }
                        clonedRow[i] = value;
                    }

                    if (columnName.includes("alleles")) {                    
                        if (columnName.includes("mother-alleles")) {
                            motherHasDominantAllele = ((value.match(/:Q/g) || []).length > 0);
                            motherHasRecessiveAllele = ((value.match(/:q/g) || []).length > 0);

                        } else if (columnName.includes("father-alleles")) {
                            fatherHasDominantAllele = ((value.match(/:Q/g) || []).length > 0);
                            fatherHasRecessiveAllele = ((value.match(/:q/g) || []).length > 0);
                        }
                        value = value.replace(/\:Q/g, traitMap[":Q"])
                                     .replace(/\:q/g, traitMap[":q"]);                        
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

                rules.push(this._createRule(ruleId, columnMap, headerRow, clonedRow));
            });
            return rules;
        } else {
            return [
                this._createRule(ruleId, columnMap, headerRow, currentRow)
            ];
        }
    }

    _getTraitTarget(traitInfo, row, columnMap, headerRow) {
        // The characteristic is specified as target in the rule
        var characterisitcColumnName = "target-characteristics";
        if (columnMap.hasOwnProperty(characterisitcColumnName)) {
            return row[columnMap[characterisitcColumnName]].toLowerCase(); 
        } 
        
        //console.warn("Unable to identify characteristic row for Dominant/Recessive generic rule");  
        // TODO rgtaylor 2018-02-27 Return and gracefully handle null as 'indeterminate' value
        // Default to dominant
        return "dominant";   
    }

    _createRule(ruleId, columnMap, headerRow, currentRow) {
        var conditions = [];
        conditions = conditions.concat(this._extractConditions("context.challengeCriteria", "target", headerRow, currentRow));
        conditions = conditions.concat(this._extractConditions("context.userSelections","selected", headerRow, currentRow));
        conditions = conditions.concat(this._extractConditions("context.current","current", headerRow, currentRow));
        conditions = conditions.concat(this._extractConditions("context","condition", headerRow, currentRow));

        if (conditions.length == 0) {
            throw new Error("Missing conditions in CSV. Unable to find columns with condition prefixes: Target-, Selected-, or Condition-");
        }

        return new Rule(
            this.source,
            ruleId, 
            this._asNumber(this._getCell(currentRow, columnMap, "priority")),
            conditions,
            this._asBoolean(this._getCell(currentRow, columnMap, "correct", false)),
            this._extractConcepts(headerRow, currentRow));
    }

    _isDominantRecessiveRule(row) {
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

    _extractConditions(basePropertyPath, prefix, headerRow, currentRow) {
        let conditions = [];
         for (let i = 0; i < headerRow.length; ++i) {
            if (this._isColumnOfType(prefix, headerRow[i])) {
                let targetValue = currentRow[i].trim();
                if (targetValue) {
                    let columnName = headerRow[i];
                    let ruleType = this._extractRuleTypeFromColumnName(columnName);
                    let propertyPath = basePropertyPath + "." + this._extractProprtyPathFromColumnName(columnName);
                    conditions.push(this._createCondition(ruleType, targetValue, propertyPath, columnName));
                }
            }
         }

         return conditions;
    }

    // Assume last word specifies the type of rule
    // E.g., Target-Sex -> Sex
    _extractRuleTypeFromColumnName(columnName) {
        var columnNameWithoutSibling = columnName.replace(/-Sibling\d+$/, "");
        var words = columnNameWithoutSibling.split("-");
        return words[words.length - 1];
    }

    // Assume last word specifies the type of rule
        // E.g., Selected-Offspring-Sex -> offspringSex
    _extractProprtyPathFromColumnName(columnName) {
        let value = columnName.trimThroughFirst("-");
        value = value.replace("-", "");
        return value.lowerCaseFirstChar();
    }

    _createCondition(type, value, propertyPath, columnName) {
        let displayVariable = columnName.toCamelCase();

        // The last word indicates the type of condition (e.g., sex or trait)
        let condition = null;
        switch(type.toLowerCase()) {

            case "alleles":
                condition = new RuleCondition.AllelesCondition(propertyPath, value, displayVariable);
                break;

            case "sex":
                condition = new RuleCondition.SexCondition(propertyPath, value, displayVariable);
                break;

            case "trait":
                condition = new RuleCondition.TraitCondition(propertyPath, value, displayVariable);
                break;

            case "challengeid":
                condition = new RuleCondition.StringCondition(propertyPath, value, displayVariable, true);
                break;

            case "correct":
                condition = new RuleCondition.BoolCondition(propertyPath, value, displayVariable);
                break;

            default:
                throw new Error("Unknown RuleCondition type: " + type);
        }

        return condition;
    }

    _extractConcepts(headerRow, currentRow) {
        var concepts = {};
         for (var i = 0; i < headerRow.length; ++i) {
            if (this._isConceptId(headerRow[i])) {
                var value = currentRow[i].trim();
                if (value) {
                    var conceptId = this._extractHeadingValue(headerRow[i]);
                    concepts[conceptId] = this._asBoolean(value);
                }
            }
         }
         return concepts;
    }

    _isConceptId(text) {
        return this._isColumnOfType("concept", text);
    }
}

module.exports = RuleCsvDeserializer;