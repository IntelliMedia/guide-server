'use strict';

const Biologicax = require('../shared/biologicax');
const RuleCondition = require('./ruleCondition');
const TraitCondition = require('./ruleCondition').TraitCondition;
const arrayx = require("../utilities/arrayx");
const _ = require('lodash');

class Rule {   
    constructor(source, id, priority, conditions, isCorrect, concepts) {
        this.source = source;
        this.id = id;
        this.priority = priority;
        this.conditions = conditions;
        this.concepts = concepts;
        this.attribute = null;
        this.isCorrect = isCorrect;

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

    sourceUrl() {
        return this.source + '/edit#gid=0?range=' + this.id + ':' + this.id;
    }

    substitutionVariables() {
        let targetCondition = this._findTargetCondition(); 
        return {
            attribute: BiologicaX.getDisplayName(this.attribute),
            correct: this._findTargetCondition("challengeCriteria").getDisplayValue(),
            incorrect: this._findTargetCondition("userSelections").getDisplayValue()
        };
    }

    _findTargetCondition(path) {
        for(let condition of this.conditions) {
            // Does this condition represent the target?
            if (condition.propertyPath.includes(path)) {
                return condition;
            }
        }
    }

    evaluate(event) {

        let allConditionsMatched = false;
        // Is the characteristic editable by the user in the client?
        if (this.attribute === "n/a" || event.context.selectableAttributes.indexOf(this.attribute) >= 0) {
            // If so evaluate the event
            allConditionsMatched = this.conditions.every((condition) => {
                let result = condition.evaluate(event);
                return result;
            });
        }

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