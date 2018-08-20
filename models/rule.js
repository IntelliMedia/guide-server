'use strict';

// Base class for all rules that can be evaluated by the RuleEvaluator class
class Rule {   
    constructor(attribute) {
        this.attribute = attribute;
    }

    sourceAsUrl() {
        throw new Error("Not implemented. This must be overriden in a derived class.");
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