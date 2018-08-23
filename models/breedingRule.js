'use strict';

const Biologicax = require('../shared/biologicax');
const AttributeRule = require('./attributeRule');

class BreedingRule extends AttributeRule {   
    constructor(attribute, targetMap) {
        super(attribute, targetMap);

        this._incorrectParent = "n/a";
    }

    substitutionVariables() {
        this._checkEvaluated();

        return {
            attribute: BiologicaX.getDisplayName(this.attribute),
            selected: BiologicaX.getDisplayName(this._selected),
            target: BiologicaX.getDisplayName(this._target),
            incorrectParent: BiologicaX.getDisplayName(this._incorrectParent)
        };
    }

    evaluate(event) {
        let isActivated = false;
        if (this.attribute === "sex") {
            // The sex isn't selectable for this kind of challenge, don't evaluate it
            isActivated = false;
        } else {
            isActivated = this._evaluateBreeding(event);
        }

        // Only activate the rule if the attribute was changed OR if it
        // was incorrect to avoid firing success for previously successful attributes
        // and inflating scores for non-moves.
        if (isActivated) {
            isActivated = !this._isCorrect || this._hasParentChanged(event);
        }
    }

    _evaluateBreeding(event) {

        let speciesName = this._getProperty(event, "context.species", true);

        let targeOffspring = this._getProperty(event, "context.target", true);
        if (!Array.isArray(targeOffspring)) {
            throw new Error("Event context.target does not contain array of offspring.");
        }

        let isActivated = this._targetMap.hasOwnProperty(targeOffspring[0].phenotype[this.attribute]);
        if (!isActivated) {
            return false;
        }

        let motherConstant = false;
        let motherAlleles = this._getProperty(event, "context.selected.motherAlleles", false);
        if (motherAlleles == null) {
            motherAlleles = this._getProperty(event, "context.constant.motherAlleles", true);
            motherConstant = true;
        }

        let fatherConstant = false;
        let fatherAlleles = this._getProperty(event, "context.selected.fatherAlleles", false);
        if (fatherAlleles == null) {
            fatherAlleles = this._getProperty(event, "context.constant.fatherAlleles", true);
            fatherConstant = true;
        }

        let offspringResults = [];
        for(let offspring of targeOffspring) {
            let phenotype = offspring.phenotype;

            isActivated &= this._targetMap.hasOwnProperty(phenotype[this.attribute]);

            // Don't activate the rule if evaluating color-related trait and the target is albino since
            // the color traits will be ignored.
            if (this.attribute === "black" || this.attribute === "dilute") {
                if (phenotype["colored"] === "Albino") {
                    isActivated = false;
                }
            }

            if (!isActivated) {
                break;
            }

            let characteristic = phenotype[this.attribute];
            let correctParents = BiologicaX.canParentsProduceOffspringWithCharacteristic(
                speciesName, 
                motherAlleles,
                fatherAlleles,
                this.attribute,
                characteristic
            );

            offspringResults.push({
                isCorrect: correctParents,
                targetCharacteristic: characteristic
            });
        }

        if (isActivated) {
            this._isCorrect = offspringResults.every((item) => item.isCorrect);
            this._target = offspringResults.find((item) => item.isCorrect == this._isCorrect).targetCharacteristic;
            this._selected = "n/a";
            this._concepts = this._targetMap[this._target].conceptIds;
            if (motherConstant) {
                this._incorrectParent = "dad";
            } else if (fatherConstant) {
                this._incorrectParent = "mom";
            } else { 
                this._incorrectParent = this._parentSubstitutionString(
                    speciesName, 
                    motherAlleles,
                    fatherAlleles,
                    this.attribute,
                    this._target
                );
            }
        }

        return isActivated;
    }

    _hasParentChanged(event) {
        // If there is no previous property, we can't determine if the selection has changed, 
        // assume it has.
        if (!event.context.hasOwnProperty("previous")) {
            return false;
        }

        let speciesName = this._getProperty(event, "context.species", true);

        let motherChanged = false;
        let motherAlleles = this._getProperty(event, "context.selected.motherAlleles", false);
        if (motherAlleles != null) {
            motherChanged = BiologicaX.hasAttributeChanged(
                speciesName, 
                motherAlleles, 
                "Female", 
                this._getProperty(event, "context.previous.motherAlleles", true), 
                "Female",
                this.attribute);
        }

        let fatherChanged = false;
        let fatherAlleles = this._getProperty(event, "context.selected.fatherAlleles", false);
        if (fatherAlleles != null) {
            fatherChanged = BiologicaX.hasAttributeChanged(
                speciesName, 
                fatherAlleles, 
                "Male", 
                this._getProperty(event, "context.previous.fatherAlleles", true), 
                "Male",
                this.attribute);
        }

        if (!motherChanged) {
            this._incorrectParent = "dad";
        }
        if (!fatherChanged) {
            this._incorrectParent = "mom";
        }

        return motherChanged || fatherChanged;
    }

    _parentSubstitutionString(                
        speciesName, 
        motherAlleles,
        fatherAlleles,
        trait,
        characteristic) {

        let parent = BiologicaX.whichParentDoesntContributeToOffspringWithCharacteristic(
                speciesName, 
                motherAlleles,
                fatherAlleles,
                trait,
                characteristic);

        // Convert to words used in the hint text
        if (parent == "mother") {
            return "mom";
        } else if (parent == "father") {
            return "dad";
        } else if (parent == "both") { 
            return "parents";
        } else {
            return "n/a";
        }
    }
}

module.exports = BreedingRule;