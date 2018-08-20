'use strict';

const Biologicax = require('../shared/biologicax');
const RuleCondition = require('./ruleCondition');
const GoogleSheetRepository = require('../storage/googleSheetRepository');
const arrayx = require("../utilities/arrayx");
const _ = require('lodash');

class TraitRule {   
    constructor(source, id, attribute, targetMap) {
        this.source = source;
        this.id = id;
        this.attribute = attribute;
        this.targetMap = targetMap;

        this.target = null;
        this.selected = null;
        this.isCorrect = false;
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

    _conditionsAsString(conditions) {
        let s = "";
        let prependAnd = false;
        this.conditions.forEach((condition) => {
            if (prependAnd) {
                s += " && ";
            }
            s += condition.value;
            prependAnd = true;
        });

        return s;
    }
}

module.exports = TraitRule;