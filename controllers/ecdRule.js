'use strict';

const EcdRuleCondition = require('./ecdRuleCondition');
const CharacteristicsCondition = require('./ecdRuleCondition').CharacteristicsCondition;
const _ = require('lodash');

class EcdRule {   
    constructor(id, priority, conditions, concepts, hints) {
        this.id = id;
        this.source = null;
        this.priority = priority;
        this.conditions = conditions;
        this.concepts = concepts;
        this.hints = hints;
        this.trait = null;
        this.isMisconception = false;

        if (!this.conditions || this.conditions.length == 0) {
            throw new Error("No conditions defined for ECD rule.")
        }

        let traits = [];
        this.conditions.forEach((condition) => {
            if (condition.trait) {
                traits.push(condition.trait);
            }
        });

        traits = _.uniq(traits);
        if (traits.length > 1) {
            this.trait = "multiple";
        } else if (traits.length == 1) {
            this.trait = traits[0];
        } else {
            this.trait = "unknown";
            console.warn("Unable to determine trait for rule");
        }

        for (var concept in this.concepts) {
            if (!this.concepts.hasOwnProperty(concept)) {
                continue;
            }
            if (this.concepts[concept] < 0) {
                this.isMisconception = true;
                break;
            }
        }
    }

    evaluate(event) {

        let allConditionsMatched = this.conditions.every((condition) => {
            let result = condition.evaluate(event);
            return result;
        });

        return allConditionsMatched;
    }

    conditionsAsString(conditions) {
        let s = "";
        let prependAnd = false;
        this.conditions.forEach((condition) => {
            if (prependAnd) {
                s += " && ";
            }
            s += condition.description();
            prependAnd = true;
        });

        return s;
    }
}

module.exports = EcdRule;