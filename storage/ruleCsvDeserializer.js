'use strict';

const GenericRule = require('../models/genericRule');
const RuleCondition = require('../models/ruleCondition');
const CsvDeserializer = require('./csvDeserializer');
const Stringx = require('../utilities/stringx');

/**
 * This class uses parses a CSV to create rules to evaluate the student
 */
class RuleCsvDeserializer extends CsvDeserializer {
    constructor() {
        super();
    }
  
    parseRow(currentRowIndex, source, columnMap, headerRow, currentRow) {

        let SimpleDominantRecessiveMap = [
            { dominant: "Wings", recessive: "No wings", "Q":"W", "q":"w", characterisiticName: {dominant: "wings", recessive: "wingless"}},
            { dominant: "Forelimbs", recessive: "No forelimbs", "Q":"Fl", "q":"fl", characterisiticName: {dominant: "arms", recessive: "armless"}},
            { dominant: "Hindlimbs", recessive: "No hindlimbs", "Q":"Hl", "q":"hl", characterisiticName: {dominant: "legs", recessive: "legless"}},
            { dominant: "Hornless", recessive: "Horns", "Q":"H", "q":"h", characterisiticName: {dominant: "hornless", recessive: "horns"}},
            { dominant: "Metallic", recessive: "Nonmetallic", "Q":"M", "q":"m", characterisiticName: {dominant: "shiny", recessive: "dull"}},
            { dominant: "Colored", recessive: "Albino", "Q":"C", "q":"c", characterisiticName: {dominant: "colored", recessive: "albino"}},
            { dominant: "Gray", recessive: "Orange", "Q":"B", "q":"b", characterisiticName: {dominant: "gray", recessive: "orange"}},
            { dominant: "Deep", recessive: "Faded", "Q":"D", "q":"d", characterisiticName: {dominant: "deep", recessive: "faded"}}
        ];

        let SexLinkedDominantRecessiveMap = [
            { dominant: "Nose spike", recessive: "No nose spike", "Q":"Rh", "q":"rh", characterisiticName: {dominant: "spiked", recessive: "spikeless"}},
        ];

        let isSexLinked = this._isSexLinkedRules(headerRow);

        if (this._isDominantRecessiveRule(currentRow)) {
            let substitutionMap = (isSexLinked ? SexLinkedDominantRecessiveMap : SimpleDominantRecessiveMap);

            var rules = [];

            substitutionMap.forEach((traitMap) => {
                var clonedRow = currentRow.slice();
                var targetCharacterisitic = this._getTraitTarget(traitMap, clonedRow, columnMap, headerRow);
                var isTargetTraitDominant = targetCharacterisitic === "dominant";

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
                        value = value.replace(/Q/g, traitMap["Q"])
                                     .replace(/q/g, traitMap["q"]);                        
                        clonedRow[i] = value;
                    }
                }

                rules.push(this._createRule(currentRowIndex, source, columnMap, headerRow, clonedRow));
            });
            return rules;
        } else {
            return [
                this._createRule(currentRowIndex, source, columnMap, headerRow, currentRow)
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

    _createRule(ruleId, source, columnMap, headerRow, currentRow) {
        var conditions = [];
        conditions = conditions.concat(this._extractConditions("context.target", "target", headerRow, currentRow));
        conditions = conditions.concat(this._extractConditions("context.selected","selected", headerRow, currentRow));
        conditions = conditions.concat(this._extractConditions("context.previous","previous", headerRow, currentRow));
        conditions = conditions.concat(this._extractConditions("context","condition", headerRow, currentRow));

        if (conditions.length == 0) {
            throw new Error("Missing conditions in CSV. Unable to find columns with condition prefixes: Target-, Selected-, or Condition-");
        }

        return new GenericRule(
            source,
            ruleId, 
            conditions,
            this._asBoolean(this._getCell(currentRow, columnMap, "correct", false)),
            this._extractConcepts(headerRow, currentRow),
            this._extractSubstitutionVariables(headerRow, currentRow));
    }

    _isBreedingRule(headerRow) {
        for (let header of headerRow) {
            let columnName = header.toLowerCase();

            if (columnName.includes("mother-alleles") 
                || columnName.includes("father-alleles")) {
                return true;
            }
        }

        return false;
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

    _isSexLinkedRules(headerRow) {
        let targetSex = false;
        let targetTrait = false;

        for (var i = 0; i < headerRow.length; ++i) {
            var value = headerRow[i];
            if (value) {
                value = value.trim().toLowerCase();
                if (value === "target-sex") {
                    targetSex = true;
                }
                if (value === "target-trait") {
                    targetTrait = true;
                }
            }
        }

        return targetSex && targetTrait;
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
        var concepts = [];
         for (var i = 0; i < headerRow.length; ++i) {
            if (this._isConceptId(headerRow[i])) {
                var value = currentRow[i].trim();
                if (value && this._asBoolean(value) === true) {
                    var conceptId = this._extractHeadingValue(headerRow[i]);
                    concepts.push(conceptId);
                }
            }
         }
         return concepts;
    }

    _isConceptId(text) {
        return this._isColumnOfType("concept", text);
    }

    _extractSubstitutionVariables(headerRow, currentRow) {
        var variableMap = {};
         for (var i = 0; i < headerRow.length; ++i) {
            if (this._isSubstitutionVariable(headerRow[i])) {
                var value = currentRow[i].trim();
                if (value) {
                    var substitutionVariable = this._extractProprtyPathFromColumnName(headerRow[i]);
                    variableMap[substitutionVariable] = value;
                }
            }
         }
         return variableMap;
    }

    _isSubstitutionVariable(text) {
        return this._isColumnOfType("substitution", text);
    }
}

module.exports = RuleCsvDeserializer;