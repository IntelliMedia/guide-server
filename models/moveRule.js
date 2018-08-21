'use strict';

const Biologicax = require('../shared/biologicax');
const AttributeRule = require('./attributeRule');

class MoveRule extends AttributeRule {   
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
        // If this rules doesn't apply, don't bother computing moves
        if (!super.evaluate(event)) {
            return false;
        }

        // If there is no previous, we can't determine if the selection is fewer
        // moves
        if (!event.context.hasOwnProperty("previous")) {
            return false;
        }

        this._checkProperty(event.context.previous, "alleles");
        this._checkProperty(event.context.previous, "sex");

        let currentRemainingMoves = BiologicaX.numberOfMovesToCharacteristic(
            event.context.species, 
            event.context.selected.alleles,
            event.context.selected.sex,
            this.attribute,
            event.context.target.phenotype[this.attribute]
        );

        let previousRemainingMoves = BiologicaX.numberOfMovesToCharacteristic(
            event.context.species, 
            event.context.previous.alleles,
            event.context.previous.sex,
            this.attribute,
            event.context.target.phenotype[this.attribute]
        );

        let isActivated = (this._selected === this._target);
        if (isActivated) {
            this._isCorrect = currentRemainingMoves < previousRemainingMoves;
            this._concepts = ["LG99.A"];
        }

        return isActivated;
    }
}

module.exports = MoveRule;