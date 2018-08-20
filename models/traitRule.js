'use strict';

const Biologicax = require('../shared/biologicax');
const Rule = require('./rule');
const RuleCondition = require('./ruleCondition');
const GoogleSheetRepository = require('../storage/googleSheetRepository');
const arrayx = require("../utilities/arrayx");
const _ = require('lodash');

class TraitRule extends Rule {   
    constructor(source, id, attribute, targetMap) {
        super(source, id, attribute);

        this.targetMap = targetMap;
        this.target = null;
        this.selected = null;
        this.isCorrect = false;
    }

    isCorrect() {
        throw new Error("Not implemented. This must be overriden in a derived class.");
    }

    concepts() {
        throw new Error("Not implemented. This must be overriden in a derived class.");
    }

    substitutionVariables() {
        return {
            attribute: BiologicaX.getDisplayName(this.attribute),
            selectedTrait: BiologicaX.getDisplayName(this.selected),
            targetTrait: BiologicaX.getDisplayName(this.target)
        };
    }

    evaluate(event) {
        
        let debugMsg = "";

        if (!event.context.selected.hasOwnProperty("phenotype")) {
            event.context.selected.phenotype = this._createPhenotypeFromAlleles(
                event.context.selected.alleles,
                event.context.selected.sex
            );
        }

        let selected =  event.context.target.phenotype[attribute];
        let target =  event.context.target.phenotype[attribute];

        this.isCorrect = (selected === target);

        let isActivated = target === this.target
            && selected === this.selected;

        // Use this log statement to debug rules
        console.log("Rule | " + isActivated + " | " + this.attribute  + " == " + this.target);

        return isActivated;
    }

    _createPhenotypeFromAlleles(alleles, sex) {
        var phenotype = null; 

        if (alleles != undefined && sex != undefined) {
            console.warn("Phenotype missing from context. Creating from alleles. Assuming species is Drake");
            var organism = new BioLogica.Organism(BioLogica.Species.Drake, alleles, BiologicaX.sexFromString(sex));
            phenotype = organism.phenotype.characteristics;  
        }
        
        return phenotype;
    }
}

module.exports = TraitRule;