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

        let speciesName = this._getProperty(event, "context.species", true);
        
        let selectedAlleles = this._getProperty(event, "context.selected.alleles", true);
        let selectedSex = this._getProperty(event, "context.selected.sex", true);

        let currentRemainingMoves = BiologicaX.numberOfMovesToCharacteristic(
            speciesName, 
            selectedAlleles,
            selectedSex,
            this.attribute,
            this._target
        );

        let previousAlleles = this._getProperty(event, "context.previous.alleles", true);
        let previousSex = this._getProperty(event, "context.previous.sex", true);

        let previousRemainingMoves = BiologicaX.numberOfMovesToCharacteristic(
            speciesName, 
            previousAlleles,
            previousSex,
            this.attribute,
            this._target
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