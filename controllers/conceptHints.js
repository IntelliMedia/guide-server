'use strict';

const _ = require('lodash');

class ConceptHints {   
    constructor(source, id, conceptId, tags, hints) {
        this.findReplacementBlock = new RegExp("\\[(?:([^\\]\\:]+)\\:)?([^\\]]*)\\]", "i");
        this.source = source;
        this.id = id;
        this.conceptId = conceptId;
        this.tags = tags;
        this.hints = hints;

        if (!this.hints || this.hints.length == 0) {
            throw new Error("No hints defined for concept.")
        }
    }

    sourceUrl() {
        return this.source + '/edit#gid=0?range=' + this.id + ':' + this.id;
    }

    getHint(hintLevel, substitutionVariables) {
        if (hintLevel >= this.hints.length) {
            throw new Error("Requested hint level (" + hintLevel + ") not defined in: " + this.sourceUrl());
        }

        let hint = this.hints[hintLevel];

        return this._substituteHintVariables(hint, substitutionVariables);
    }

    _substituteHintVariables(hint, substitutionVariables) {

        var value = hint;
        do {
            var replacementBlock = value.match(this.findReplacementBlock);
            if (replacementBlock != null) {
                var block = replacementBlock[0];
                var missingValue = block.replace("[","<").replace("]",">");
                var selector = (replacementBlock[1] ? replacementBlock[1] : missingValue);
                var phrases = (replacementBlock[2] ? replacementBlock[2] : missingValue);

                var substitutionPhrase = selector;
                let variable = substitutionVariables[selector];
                if (variable) {
                    var findPhrase = new RegExp("([^,\\[]*" + variable + "[^,\\]]*)", "i");
                    var phraseMatch = phrases.match(findPhrase);
                    if (phraseMatch != null) {
                        substitutionPhrase = phraseMatch[0];
                    } else {
                        substitutionPhrase = variable;
                    }
                }
                else 
                {
                    console.warn("Unable to find substitution for: " + block);
                }

                value = value.replace(block, substitutionPhrase.trim());
            }
        } while (replacementBlock != null);

        return value;
    }    
}

module.exports = ConceptHints;