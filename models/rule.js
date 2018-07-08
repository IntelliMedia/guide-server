'use strict';

const Biologicax = require('../shared/biologicax');
const RuleCondition = require('./ruleCondition');
const GoogleSheetRepository = require('../storage/googleSheetRepository');
const arrayx = require("../utilities/arrayx");
const _ = require('lodash');

class Rule {   
    constructor(source, id, conditions, isCorrect, concepts, substitutions) {
        this.source = source;
        this.id = id;
        this.conditions = conditions;
        this.concepts = concepts;
        this.attribute = null;
        this.isCorrect = isCorrect;
        this.substitutions = substitutions;

        if (!this.conditions || this.conditions.length == 0) {
            throw new Error("No conditions defined for ECD rule.")
        }

        let attributes = [];
        this.conditions.forEach((condition) => {
            if (condition.isUserSelection && condition.attribute) {
                attributes.push(condition.attribute);
            }
        });

        attributes = _.uniq(attributes);
        if (attributes.length > 1) {
            throw new Error("Rule specifies more than one attribute: ", attributes.join(", "));
        }

        // Remove duplicates
        this.attribute = (attributes.length > 0 ? attributes[0] : "n/a");
    }

    substitutionVariables() {
        let variableMap = {
            attribute: BiologicaX.getDisplayName(this.attribute)
        };

        if (this.substitutions) {
            variableMap = Object.assign(this.substitutions, variableMap);
        }

        for(let condition of this.conditions) {
            // Does this condition represent the target?
            condition.populateSubstitutionVariables(variableMap);
        }   
        
        return variableMap;
    }

    evaluate(event) {
        
        let debugMsg = "";

        let allConditionsMatched = this.conditions.every((condition) => {
            try {
                let result = condition.evaluate(event);
                debugMsg += "[" + condition.toString() + " -> " + result + "] "
                return result;
            } catch(err) {
                err.message += " [Rule Source: " + GoogleSheetRepository.sourceAsUrl(this) + "]";
                throw err;
            }
        });

        // Use this log statement to debug rules
        console.log("Rule | " + this.attribute  + " -> " + allConditionsMatched + "  " + debugMsg);

        return allConditionsMatched;
    }

    conditionsAsString(conditions) {
        let s = "";
        let prependAnd = false;
        this.conditions.forEach((condition) => {
            if (prependAnd) {
                s += " && ";
            }
            s += condition.value;
            prependAnd = true;
        });

        return s;
    }
}

module.exports = Rule;