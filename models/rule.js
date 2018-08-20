'use strict';

// Base class/interface for all rules that can be evaluated by the RuleEvaluator class
class Rule {   
    constructor(source, id) {
        this.source = source;
        this.id = id;
    }

    substitutionVariables() {
        throw new Error("Not implemented. This must be overriden in a derived class.");
    }

    evaluate(event) {
        throw new Error("Not implemented. This must be overriden in a derived class.");
    }
}

module.exports = Rule;