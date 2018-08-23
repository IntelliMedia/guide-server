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
        if (this.attribute === "sex") {
            // Since sex is binary, it is either right or wrong, there
            // are no unnecessary moves.
            return false;
        } else {
            return this._evaluateBreeding(event);
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

        let motherAlleles = this._getProperty(event, "context.selected.motherAlleles", true);
        let fatherAlleles = this._getProperty(event, "context.selected.fatherAlleles", true);

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
            this._incorrectParent = this._parentSubstitutionString(
                speciesName, 
                motherAlleles,
                fatherAlleles,
                this.attribute,
                this._target
            );
        }

        return isActivated;
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