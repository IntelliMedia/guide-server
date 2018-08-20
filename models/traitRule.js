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

        this._targetMap = targetMap;
        this._selected = null;
        this._target = null;
    }

    isCorrect() {
        this._checkEvaluated();

        return (this._selected === this._target);
    }

    concepts() {
        this._checkEvaluated();

        return this._targetMap[this._target];
    }

    substitutionVariables() {
        this._checkEvaluated();

        return {
            attribute: BiologicaX.getDisplayName(this.attribute),
            selectedTrait: BiologicaX.getDisplayName(this._selected),
            targetTrait: BiologicaX.getDisplayName(this._target)
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

        this._selected =  event.context.selected.phenotype[this.attribute];
        this._target =  event.context.target.phenotype[this.attribute];

        let isActivated = this._targetMap.hasOwnProperty(this._target);

        // Use this log statement to debug rules
        console.log("Rule | " + isActivated + " | " + this.attribute  + " == " + this._target);

        return isActivated;
    }

    _checkEvaluated() {
        if (this._selected == null || this._target == null) {
            throw new Error("Rule has not been evaluated.");
        }
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