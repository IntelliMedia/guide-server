'use strict';

const _ = require('lodash');

class ConceptHints {
    constructor(source, id, priority, conceptId, minimumAttempts, probabilityLearnedThreshold, tags, hints) {
        this.findReplacementBlock = new RegExp("\\[(?:([^\\]\\:]+)\\:)?([^\\]]*)\\]", "i");
        this.source = source;
        this.id = id;
        this.priority = priority;
        this.conceptId = conceptId;
        this.minimumAttempts = minimumAttempts;
        this.probabilityLearnedThreshold = probabilityLearnedThreshold;
        this.tags = tags;
        this.hints = hints;

        if (!this.hints || this.hints.length == 0) {
            throw new Error("No hints defined for concept.")
        }
    }

    getHint(hintIndex, substitutionVariables) {
        if (hintIndex >= this.hints.length) {
            throw new Error("Requested hint level (" + hintIndex + ") not defined in: "
                + this.source + " for row " + this.id);
        }

        let hint = this.hints[hintIndex];

        return this._substituteHintVariables(hint, substitutionVariables);
    }

    // Substituion variables have the following format:
    //   [<variableName>: <phrase1>, <phrase2>, ...]
    // Where the <phrase> is selected by the variable value
    // Example 1:
    //   [selectedTrait: dull, wingless, armless, legless, not gray, without color, has horns]
    // Becomes:
    //   not gray
    // If the variable value is "gray"
    //
    // Example 2: simply substitute the the variable value itself:
    //   [selectedTrait]
    // Becomes:
    //   gray
    // If the variable value is "gray"
    _substituteHintVariables(hint, substitutionVariables) {

        var value = hint;
        do {
            var replacementBlock = value.match(this.findReplacementBlock);
            if (replacementBlock != null) {
                var block = replacementBlock[0];
                var missingValue = block.replace("[","<").replace("]",">");

                let selector = missingValue;
                let phrases;
                if (replacementBlock.length > 2) {
                    // Does substitution string contain phrases?
                    if (replacementBlock[1] != undefined) {
                        selector = replacementBlock[1].trim();
                        phrases = replacementBlock[2];
                    } else if (replacementBlock[2] != undefined) {
                        // If not, don't define phrases and default to simple replacement
                        selector = replacementBlock[2].trim();
                    }
                }

                // Default the substituion string to the variable name in case it isn't
                // defined in the substitutionVariables
                var substitutionPhrase = selector;

                let variable = substitutionVariables[selector];
                if (variable) {
                    // Default to the the substitution variable
                    substitutionPhrase = variable;
                    if (phrases) {
                        // Use a phrase is one is defined
                        var findPhrase = new RegExp("([^,\\[]*" + this._getWordRoot(variable) + "[^,\\]]*)", "i");
                        var phraseMatch = phrases.match(findPhrase);
                        if (phraseMatch != null) {
                            substitutionPhrase = phraseMatch[0];
                        }
                    }
                }
                else
                {
                    console.warn("Unable to find substitution for: " + block);
                }

                if (substitutionPhrase == undefined || substitutionPhrase == null) {
                    throw new Error("Unable to identify substitution phrase in hint: " + hint);
                }

                value = value.replace(block, substitutionPhrase.trim());
            }
        } while (replacementBlock != null);

        return value;
    }

    // TODO rgtaylor 2018-06-20 Remove this hardcoded workaround for matching root words
    _getWordRoot(word) {
        if (word === "shiny") {
            return "shin";
        } else if (word.includes("spike")) {
            return "spike";
        } else if (word.slice(-1) === "s") {
            // Remove 's' from wings, arms, legs, etc.
            return word.slice(0, word.length -1);
        }

        return word;
    }
}

module.exports = ConceptHints;