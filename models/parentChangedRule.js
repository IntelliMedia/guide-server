'use strict';

const Biologicax = require('../shared/biologicax');
const BreedingRule = require('./breedingRule');

class ParentChangedRule extends BreedingRule {   
    constructor(attribute, targetMap) {
        super(attribute, targetMap);
    }

    evaluate(event) {
        if (this.attribute === "sex") {
            // Since sex is binary, it is either right or wrong, there
            // are no unnecessary moves.
            return false;
        } else {
            return this._evaluateMove(event);
        }
    }

    _evaluateMove(event) {
        // If this rule doesn't apply or is simple the wrong move,
        // don't bother computing moves since another rule will report
        // the move as wrong.
        if (!super.evaluate(event) || !this._isCorrect) {
            return false;
        }

        // If there is no previous, we can't determine if the selection is fewer
        // moves
        if (!event.context.hasOwnProperty("previous")) {
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

        let previousMotherAlleles = this._getProperty(event, "context.previous.motherAlleles", false);
        if (previousMotherAlleles == null) {
            previousMotherAlleles = this._getProperty(event, "context.constant.motherAlleles", true);
        }

        let previousFatherAlleles = this._getProperty(event, "context.previous.fatherAlleles", false);
        if (previousFatherAlleles == null) {
            previousFatherAlleles = this._getProperty(event, "context.constant.fatherAlleles", true);
        }

        let speciesName = this._getProperty(event, "context.species", true);

        let currentRemainingMoves = BiologicaX.numberOfMovesToContributeToOffspringCharacteristic(
            speciesName, 
            motherAlleles,
            fatherAlleles,
            this.attribute,
            this._target
        );

        let previousRemainingMoves = BiologicaX.numberOfMovesToContributeToOffspringCharacteristic(
            speciesName, 
            previousMotherAlleles,
            previousFatherAlleles,
            this.attribute,
            this._target
        );

        this._isCorrect = currentRemainingMoves < previousRemainingMoves;
        this._concepts = ["LG99.A"];

        return true;
    }
}

module.exports = ParentChangedRule;