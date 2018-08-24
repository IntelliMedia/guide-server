'use strict';

const Biologicax = require('../shared/biologicax');
const Rule = require('./rule');
const RuleCondition = require('./ruleCondition');
const GoogleSheetRepository = require('../storage/googleSheetRepository');
const arrayx = require("../utilities/arrayx");
const stringx = require("../utilities/stringx");
const _ = require('lodash');
const propPath = require('property-path');

class AttributeRule extends Rule {   
    constructor(attribute, targetMap) {
        super(attribute);

        this._targetMap = targetMap;
        this._isCorrect = null;
        this._concepts = null;
        this._selected = null;
        this._target = null;
        this._changed = null;
    }

    sourceAsUrl() {
        this._checkEvaluated();

        return GoogleSheetRepository.sourceAsUrl(this._targetMap[this._target]);
    }

    isCorrect() {
        this._checkEvaluated();

        return this._isCorrect;
    }

    concepts() {
        this._checkEvaluated();

        return this._concepts;
    }

    substitutionVariables() {
        this._checkEvaluated();

        return {
            attribute: BiologicaX.getDisplayName(this.attribute),
            selected: BiologicaX.getDisplayName(this._selected),
            target: BiologicaX.getDisplayName(this._target)
        };
    }

    evaluate(event) {

        let isActivated = false;
        if (this.attribute === "sex") {
            isActivated = this._evaluateSex(event);
        } else {
            isActivated = this._evaluateTrait(event);
        }

        // Only activate the rule if the attribute was changed OR if it
        // was incorrect to avoid firing success for previously successful attributes
        // and inflating scores for non-moves.
        if (isActivated) {
            isActivated = !this._isCorrect || this._hasOrganismChanged(event);
        }
        
        return isActivated;
    }

    _evaluateSex(event) {

        this._selected = BiologicaX.sexToString(this._getProperty(event, "context.selected.sex", true));
        this._target = BiologicaX.sexToString(this._getProperty(event, "context.target.sex", true));

        let isActivated = this._targetMap.hasOwnProperty(this._target);
        if (isActivated) {
            this._isCorrect = BiologicaX.isSexEqual(this._selected, this._target);
            this._concepts = this._targetMap[this._target].conceptIds;
        }

        return isActivated;
    }

    _evaluateTrait(event) {
        if (!event.context.selected.hasOwnProperty("phenotype")) {
            event.context.selected.phenotype = this._createPhenotypeFromAlleles(
                event.context.selected.alleles,
                event.context.selected.sex
            );
        }

        if (!event.context.target.hasOwnProperty("phenotype")) {
            event.context.target.phenotype = this._createPhenotypeFromAlleles(
                event.context.target.alleles,
                event.context.target.sex
            );
        }

        this._selected = this._getProperty(event, "context.selected.phenotype." + this.attribute, true);
        this._target = this._getProperty(event, "context.target.phenotype." + this.attribute, true);

        let isActivated = this._targetMap.hasOwnProperty(this._target);

        // Don't activate the rule if evaluating color-related trait and the target is albino since
        // the color traits will be ignored.
        if (this.attribute === "black" || this.attribute === "dilute") {
            if (this._getProperty(event, "context.target.phenotype.colored", true) === "Albino") {
                isActivated = false;
            }
        }

        if (isActivated) {
            this._isCorrect = (this._selected === this._target);
            this._concepts = this._targetMap[this._target].conceptIds;
        }

        return isActivated;
    }

    _hasOrganismChanged(event) {
        // If there is no previous property, we can't determine if the selection has changed, 
        // assume it has.
        if (!event.context.hasOwnProperty("previous")) {
            return false;
        }

        let currentAlleles = this._getProperty(event, "context.selected.alleles", true);
        let currentSex = BiologicaX.sexToString(this._getProperty(event, "context.selected.sex", true));

        let previousAlleles = this._getProperty(event, "context.previous.alleles", true);
        let previousSex = BiologicaX.sexToString(this._getProperty(event, "context.previous.sex", true));

        let speciesName = this._getProperty(event, "context.species", true);
        return BiologicaX.hasAttributeChanged(
            speciesName, 
            currentAlleles, 
            currentSex, 
            previousAlleles, 
            previousSex,
            this.attribute);
    }

    _getProperty(obj, path, throwOnMissingProperty) {
        let propertyValue = propPath.get(obj, path);
        if (throwOnMissingProperty && propertyValue == undefined) {
            throw new Error("Unable to find event value at property path: " + path);
        }
        return propertyValue;
    }

    _checkEvaluated() {
        if (this._selected == null || this._target == null) {
            throw new Error("Attribute rule for '{0}' has not been evaluated.".format(this.attribute));
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

module.exports = AttributeRule;