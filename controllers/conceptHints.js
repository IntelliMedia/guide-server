'use strict';

const _ = require('lodash');

class ConceptHints {   
    constructor(source, id, conceptId, tags, hints) {
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

    getHint(hintLevel, attribute, correct, incorrect) {

    }

    _makeHintSpecificFor(selectorMap, headerRow, currentRow) {
        var hints = [];
         for (var i = 0; i < headerRow.length; ++i) {
            if (this._isHint(headerRow[i])) {
                var value = currentRow[i].trim();
                do {
                    var replacementBlock = value.match(this.findReplacementBlock);
                    if (replacementBlock != null) {
                        var block = replacementBlock[0];
                        var missingValue = block.replace("[","<").replace("]",">");
                        var selector = (replacementBlock[1] ? replacementBlock[1] : missingValue);
                        var phrases = (replacementBlock[2] ? replacementBlock[2] : missingValue);

                        var substitutionPhrase = selector;
                        if (selectorMap.hasOwnProperty(selector)) {
                            var phraseRegex = selectorMap[selector];
                            var findPhrase = new RegExp("([^,\\[]*" + phraseRegex + "[^,\\]]*)", "i");
                            var phraseMatch = phrases.match(findPhrase);
                            if (phraseMatch != null) {
                                substitutionPhrase = phraseMatch[0];
                            } else {
                                substitutionPhrase = "[" + phraseRegex + "?]";
                            }
                        }
                        else 
                        {
                            console.warn("Unable to find substitution for: " + block);
                        }

                        value = value.replace(block, substitutionPhrase.trim());
                    }
                } while (replacementBlock != null);
                currentRow[i] = value.upperCaseFirstChar();
            }
         }
         return hints;
    }    
}

module.exports = ConceptHints;