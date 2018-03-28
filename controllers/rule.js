'use strict';

const RuleCondition = require('./ruleCondition');
const TraitCondition = require('./ruleCondition').TraitCondition;
const _ = require('lodash');

class Rule {   
    constructor(source, id, priority, conditions, isCorrect, concepts, hints) {
        this.source = source;
        this.id = id;
        this.priority = priority;
        this.conditions = conditions;
        this.concepts = concepts;
        this.hints = hints;
        this.trait = null;
        this.characteristic = null;
        this.isCorrect = isCorrect;

        if (!this.conditions || this.conditions.length == 0) {
            throw new Error("No conditions defined for ECD rule.")
        }

        let traits = [];
        this.conditions.forEach((condition) => {
            if (condition.isUserSelection && condition.trait) {
                traits.push(condition.trait);
            }
        });

        traits = _.uniq(traits);
        if (traits.length > 1) {
            this.trait = traits.join(",");
        } else if (traits.length == 1) {
            this.trait = traits[0];
        } else {
            this.trait = "unknown";
        }

        this.characteristic = this.trait;
    }

    sourceUrl() {
        return this.source + '/edit#gid=0?range=' + this.id + ':' + this.id;
    }

    evaluate(event) {

        let allConditionsMatched = false;
        // Is the characteristic editable by the user in the client?
        if (event.context.editableAttributes.indexOf(this.characteristic) >= 0) {
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
            s += condition.description();
            prependAnd = true;
        });

        return s;
    }
}

module.exports = Rule;