'use strict';

const Rule = require('./rule');
const GoogleSheetRepository = require('../storage/googleSheetRepository');
const lodash = require('lodash');

// Domain-independent rule that is defined by one or more conditions
class GenericRule extends Rule {   
    constructor(source, id, conditions, isCorrect, concepts, substitutions) {

        if (!conditions || conditions.length == 0) {
            throw new Error("No conditions defined for ECD rule.")
        }

        let attribute = GenericRule._extractAttributeFromConditions(conditions);
        super(attribute);

        this.source = source;
        this.id = id;
        this._conditions = conditions;
        this._concepts = concepts;
        this._isCorrect = isCorrect;
        this._substitutions = substitutions;
    }

    sourceAsUrl() {
        return GoogleSheetRepository.sourceAsUrl(this);
    }

    isCorrect() {
        return this._isCorrect;
    }

    concepts() {
        return this._concepts;
    }

    substitutionVariables() {
        let variableMap = {
            attribute: BiologicaX.getDisplayName(this.attribute)
        };

        if (this._substitutions) {
            variableMap = Object.assign(this._substitutions, variableMap);
        }

        for(let condition of this._conditions) {
            // Does this condition represent the target?
            condition.populateSubstitutionVariables(variableMap);
        }   
        
        return variableMap;
    }

    evaluate(event) {
        
        let debugMsg = "";

        let allConditionsMatched = this._conditions.every((condition) => {
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

    static _extractAttributeFromConditions(conditions) {
        let attributes = [];
        conditions.forEach((condition) => {
            if (condition.isUserSelection && condition.attribute) {
                attributes.push(condition.attribute);
            }
        });

        attributes = lodash.uniq(attributes);
        if (attributes.length > 1) {
            throw new Error("Rule specifies more than one attribute: ", attributes.join(", "));
        }

        // Remove duplicates
        let attribute = (attributes.length > 0 ? attributes[0] : "n/a");
        return attribute;
    }
}

module.exports = GenericRule;