'use strict';

const _ = require('lodash');

class ConceptHints {   
    constructor(source, id, conceptId, tags, hints) {
        this.source = source;
        this.id = id;
        this.conceptId = conceptId;
        this.tags = tags;
        this.hints = hints;

        if (!this.hints || this.hints.length == 0) {
            throw new Error("No hints defined for concept.")
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

module.exports = ConceptHints;