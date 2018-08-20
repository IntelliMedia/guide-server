'use strict';

// Base class for all rules that can be evaluated by the RuleEvaluator class
class Rule {   
    constructor(source, id, attribute) {
        this.source = source;
        this.id = id;
        this.attribute = attribute;
    }

    isCorrect() {
        throw new Error("Not implemented. This must be overriden in a derived class.");
    }

    concepts() {
        throw new Error("Not implemented. This must be overriden in a derived class.");
    }

    substitutionVariables() {
        throw new Error("Not implemented. This must be overriden in a derived class.");
    }

    evaluate(event) {
        throw new Error("Not implemented. This must be overriden in a derived class.");
    }
}

module.exports = Rule;