'use strict';

const EcdRuleCondition = require('./ecdRuleCondition');
const CharacteristicsCondition = require('./ecdRuleCondition').CharacteristicsCondition;
const _ = require('lodash');

class EcdRule {   
    constructor(id, priority, criteriaConditions, selectedConditions, concepts, hints) {
        this.id = id;
        this.source = null;
        this.priority = priority;
        this.criteriaConditions = criteriaConditions;
        this.selectedConditions = selectedConditions;
        this.concepts = concepts;
        this.hints = hints;
        this.trait = null;
        this.isMisconception = false;

        if (!this.criteriaConditions || this.criteriaConditions.length == 0) {
            throw new Error("No criteria conditions defined for ECD rule. Missing 'Criteria-' columns.")
        }

        if (!this.selectedConditions || this.selectedConditions.length == 0) {
            throw new Error("No user selected conditions defined for ECD rule. Missing 'Selected-' columns.")
        }

        let traits = [];
        this.criteriaConditions.every((condition) => {
            traits.push(condition.trait);
        });

        this.selectedConditions.every((condition) => {
            traits.push(condition.trait);
        });

        traits = _.uniq(traits);
        if (traits.length > 1) {
            this.trait = "multiple";
        } else if (traits.length == 1) {
            this.trait = traits[0];
        } else {
            this.trait = "unknown";
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

    evaluate(challengeCriteria, userSelections) {

        var criteriaMatched = this.criteriaConditions.every((condition) => {
            var result = condition.evaluate(challengeCriteria);
            return result;
        });

        var selectionsMatched = this.selectedConditions.every((condition) => {
            var result =  condition.evaluate(userSelections);
            return result;
        });

        return criteriaMatched && selectionsMatched;
    }

    criteria() {
        return this.conditionsToString(this.criteriaConditions);
    }

    selected() {
        return this.conditionsToString(this.selectedConditions);
    }

    conditionsToString(conditions) {
        var s = "";
        var prependAnd = false;
        conditions.forEach((condition) => {
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