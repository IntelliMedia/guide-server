'use strict';

const EcdRuleCondition = require('./ecdRuleCondition');
const CharacteristicsCondition = require('./ecdRuleCondition').CharacteristicsCondition;

class EcdRule {   
    constructor(priority, challengeConditions, userSelectionConditions, concepts, hints) {
        this.priority = priority;
        this.challengeConditions = challengeConditions;
        this.userSelectionConditions = userSelectionConditions;
        this.concepts = concepts;
        this.hints = hints;
        this.attributeName = null;

        if (!this.challengeConditions || this.challengeConditions.length == 0) {
            throw new Error("No challenge attribute conditions defined for ECD rule. Missing 'Attribute-' columns.")
        }

        if (!this.userSelectionConditions || this.userSelectionConditions.length == 0) {
            throw new Error("No user selection conditions defined for ECD rule. Missing 'Selected-' columns.")
        }

        var totalAdjustment = 0;
        for (var concept in this.concepts) {
            if (!this.concepts.hasOwnProperty(concept)) {
                continue;
            }
            totalAdjustment += this.concepts[concept];
        }
        this.isMisconception = totalAdjustment < 0;
    }

    evaluate(challengeCriteria, userSelections) {

        var criteriaMatched = this.challengeConditions.every((condition) => {
            var result = condition.evaluate(challengeCriteria);
            if (condition instanceof CharacteristicsCondition) {
                this.attributeName = condition.attributeName;
            }
            return result;
        });

        var selectionsMatched = this.userSelectionConditions.every((condition) => {
            var result =  condition.evaluate(userSelections);
            return result;
        });

        return criteriaMatched && selectionsMatched;
    }
}

module.exports = EcdRule;