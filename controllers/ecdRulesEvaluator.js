'use strict';

const rp = require('request-promise');
const parse = require('csv-parse');
const Group = require('../models/Group');
const biologica = require('../shared/biologica.js');
const biologicaX = require('../shared/biologicax.js');


/**
 * This class uses ECD-derived rules to evaluate student moves
 * and to provide move-specific hints.
 */
class EcdRulesEvaluator {
    constructor(csv) {
        this.rules = this.convertCsvToRules(csv);
    }

    evaluateAsync(student, session, event) {
        return new Promise((resolve, reject) => {
            console.info("Update student model for: %s (%s | %s)", student.id, session.groupId, event.context.challengeId);
            var targetSpecies = BioLogica.Species[event.context.species];
            var organism = new BioLogica.Organism(targetSpecies, event.context.selectedAlleles, event.context.submittedSex);
            
/*           
            var trait1 = BiologicaX.getTrait(organism, "Metallic");
            var trait2 = BiologicaX.getTrait(organism, "No Wings");
            var trait3 = BiologicaX.getTrait(organism, "Charcoal");

            var alleles1 = organism.genetics.getAlleleStringForTrait(trait1);
            var alleles2 = organism.genetics.getAlleleStringForTrait(trait2);
            var alleles3 = organism.genetics.getAlleleStringForTrait(trait3);


            var testRule = Rule.create("Allele", "wings", "a:W,b:w", "concepts", "hints");
            var active = testRule.evaluate(event.context.correctPhenotype, organism);

            var testRule2 = Rule.create("Allele", "wings", "a:W,b:W", "concepts", "hints");
            var active2 = testRule2.evaluate(event.context.correctPhenotype, organism);

            var testRule3 = Rule.create("Allele", "metallic", "a:M,b:M", "concepts", "hints");
            var active3 = testRule3.evaluate(event.context.correctPhenotype, organism);
*/
            return null;

            // Iterate over the genes that are editable by the student in the UI
            var conceptIdToTrait = {};
            var genesLength = event.context.editableGenes.length;
            for (var i = 0; i < genesLength; ++i) {
                var gene = event.context.editableGenes[i];
                var alleleA = BiologicaX.findAllele(targetSpecies, event.context.selectedAlleles, 'a', gene).replace('a:', '');
                var alleleB = BiologicaX.findAllele(targetSpecies, event.context.selectedAlleles, 'b', gene).replace('b:', '');
                var targetCharacteristic = BiologicaX.getCharacteristicFromPhenotype(event.context.correctPhenotype, gene);

                console.info("Update: " + targetCharacteristic);
                var rule = this.findRule(targetCharacteristic, alleleA, alleleB);
                if (rule) {
                    for (var conceptId in rule.conceptModifiers) {
                        if (rule.conceptModifiers.hasOwnProperty(conceptId)) {
                            var adjustment = rule.conceptModifiers[conceptId];
                            student.conceptState(targetCharacteristic, conceptId).value += adjustment;
                            console.info("Adjusted student model concept: " + conceptId + " adjustment=" + adjustment);
                        }
                    }
                } else {
                    console.warn("Could not find rule for: %s | %s |%s", targetCharacteristic, alleleA, alleleB);
                }
            }

            resolve(this.getHint(student, session, event));
        });
    }

    evaluateRules(student, session, event) {
        var positiveRules = [];
        var negativeRules = [];

        return {
            positiveRules: positiveRules,
            negativeRules: negativeRules
        }
    }

    findRule(characteristic, alleleA, alleleB) {
        var matches = this.rules.filter((rule) => {
            return rule.target == characteristic
                && rule["allele-a"] == alleleA
                && rule["allele-b"] == alleleB;
        });
        if (matches.length > 1) {
            console.warning("More than one rule matched: " + JSON.stringify(matches));
        }

        return (matches.length > 0 ? matches[0] : null);
    }

    getHint(student, session, event) {
        if (event.context.correct) {
            console.info("No need to send hint, organism is correct: %s ", event.context.challengeId);
            return null;
        }

        console.info("Find hint for: %s (%s | %s)", student.id, session.groupId, event.context.challengeId);

        var targetCharacteristics = [];
        event.context.editableGenes.forEach((gene) =>
        {
            targetCharacteristics.push(BiologicaX.getCharacteristicFromPhenotype(event.context.correctPhenotype, gene));
        });

        var targetSpecies = BioLogica.Species[event.context.species];

        var hintCharacteristic = null;
        var hintConceptId = null;
        var hintLevel = 0;
        var hints = null;

        // Find hint based on what was previously hinted
        var hintDelivered = student.mostRecentHint(event.context.challengeId);
        if (hintDelivered != null 
            && targetCharacteristics.indexOf(hintDelivered.characteristic) >= 0
            && student.conceptState(hintDelivered.characteristic, hintDelivered.conceptId).value < 0 ) {
            var alleleA = BiologicaX.findAlleleForCharacteristic(targetSpecies, event.context.selectedAlleles, 'a', hintDelivered.characteristic).replace('a:', '');
            var alleleB = BiologicaX.findAlleleForCharacteristic(targetSpecies, event.context.selectedAlleles, 'b', hintDelivered.characteristic).replace('b:', '');
            var rule = this.findRule(hintDelivered.characteristic, alleleA, alleleB);
            if (rule && rule.conceptModifiers.hasOwnProperty(hintDelivered.conceptId)) {      
                if (rule.conceptModifiers[hintDelivered.conceptId] < 0 && rule.hints.length > 0  && rule.hints[0]) {
                    console.info("Select hint based on sticking with characteristic: " + hintDelivered.characteristic);
                    hintConceptId = hintDelivered.conceptId;
                    hintCharacteristic = hintDelivered.characteristic;
                    hintLevel = Math.min(hintDelivered.hintLevel + 1, rule.hints.length - 1);
                    hints = rule.hints;
                }
            }
        }

        if (hints == null) {
            // Find hint based on lowest concept score of editable characteristic
            var lowestToHighestConceptStates = student.sortedConceptStatesByValue();
            console.info("Scores: " + JSON.stringify(lowestToHighestConceptStates));
            for (let conceptState of lowestToHighestConceptStates) {
                if (conceptState.value >= 0) {
                    break;
                }
                if (targetCharacteristics.indexOf(conceptState.characteristic) >= 0) {

                    var alleleA = BiologicaX.findAlleleForCharacteristic(targetSpecies, event.context.selectedAlleles, 'a', conceptState.characteristic).replace('a:', '');
                    var alleleB = BiologicaX.findAlleleForCharacteristic(targetSpecies, event.context.selectedAlleles, 'b', conceptState.characteristic).replace('b:', '');
                    var rule = this.findRule(conceptState.characteristic, alleleA, alleleB);
                    if (rule && rule.conceptModifiers.hasOwnProperty(conceptState.id)) {      
                        if (rule.conceptModifiers[conceptState.id] < 0) {
                            if (rule.hints.length > 0  && rule.hints[0]) {
                                console.info("Select hint based on lowest concept score: " + conceptState.characteristic); 
                                hintConceptId = conceptState.id;
                                hintCharacteristic = conceptState.characteristic;
                                hints = rule.hints;
                                var hintDelivered = student.mostRecentHint(event.context.challengeId, hintCharacteristic);
                                if (hintDelivered != null) {
                                    hintLevel = Math.min(hintDelivered.hintLevel + 1, rule.hints.length - 1);
                                } else {
                                    hintLevel = 0;
                                }
                                break;
                            } else {
                                console.warn("No hint available for: %s - %s [%s|%s]",
                                    event.context.challengeId, conceptState.characteristic, alleleA, alleleB);
                            }
                        }
                    }
                }
            }
        }

        var action = null;
        if (hints) {
            student.hintHistory.push({
                challengeId: event.context.challengeId,
                characteristic: hintCharacteristic, 
                conceptId: hintConceptId,
                hintLevel: hintLevel,
                timestamp: new Date()
            });
            var dialogMessage = new GuideProtocol.Text(
                'ITS.CONCEPT.FEEDBACK',
                hints[hintLevel]);
            dialogMessage.args.trait = BiologicaX.findTraitForCharacteristic(hintCharacteristic);
            action = new GuideProtocol.TutorDialog(dialogMessage);
        }

        return action;
    }

    isCharacteristicEditable(editableGenes, characteristic) {
        for (let editableGene of editableGenes) {
            if (characteristic.toLowerCase().includes(editableGene)) {
                return true;
            }
        }

        return false;
    }

    convertCsvToRules(csv) {
        var rules = [];

        var headerRow = csv[0];
        var columnCount = csv[0].length;
        var columnMap = {};
        for (var i = 0; i < columnCount; ++i) {
            columnMap[headerRow[i].toLowerCase().trim()] = i;
        }

        var rowCount = csv.length;
        for (var i = 1; i < rowCount; ++i) {
            var currentRow = csv[i];

            // Empty row?
            if (!currentRow[0].trim()) {
                continue;
            }

            rules.push(Rule.create(
                this.asNumber(currentRow[columnMap["priority"]].trim()),
                currentRow[columnMap["ruletype"]].trim(),
                currentRow[columnMap["target"]].trim(),
                currentRow[columnMap["value"]].trim(),
                this.extractConcepts(headerRow, currentRow),
                this.extractHints(headerRow, currentRow)));
        }

        return rules.sort(function(a, b) {
            return b.priority - a.priority;
        });;
    }

    asNumber(value) {
        if (typeof value === "number") {
            return value;
        }
        return (value ? Number(value) : 0);
    }

    extractConcepts(headerRow, currentRow) {
        var concepts = {};
         for (var i = 0; i < headerRow.length; ++i) {
            if (this.isConceptId(headerRow[i])) {
                var value = currentRow[i].trim();
                concepts[currentRow[i]] = this.asNumber(value);
            }
         }
         return concepts;
    }

    extractHints(headerRow, currentRow) {
        var hints = [];
         for (var i = 0; i < headerRow.length; ++i) {
            if (this.isHint(headerRow[i])) {
                hints.push(currentRow[i].trim());
            }
         }
         return hints;
    }

    isConceptId(text) {
        var target = text.toLowerCase();

        if (target.includes("ruletype")
            || target.includes("target")
            || target.includes("value")
            || target.includes("hint")
            || target.includes("note")
            || target.includes("comment")) {
                return false;
            }

            return true;
    }

    isHint(text) {
        var target = text.toLowerCase();
        return target.includes("hint");
    }
}

class Rule {   
    constructor(priority, target, value, concepts, hints) {
        this.priority = priority;
        this.target = target;
        this.value = value;
        this.concepts = concepts;
        this.hints = hints;
    }

    static create(priority, type, target, value, concepts, hints) {
        var rule = null;
        switch(type.toLowerCase()) {
            case "allele":
                rule = new AlleleRule(priority, target, value, concepts, hints);
                break;

            case "sex":
                rule = new SexRule(priority, target, value, concepts, hints);
                break;

            default:
                throw new Error("Unknown rule type: " + type);
        }

        return rule;
    }

    evaluate(correctPhenotype, organism) {
        throw new Error("This method must be overriden in a child class");
    }
}

class AlleleRule extends Rule {
    constructor(priority, target, value, concepts, hints) {
        super(priority, target, value, concepts, hints);
        
        // Remove all whitespace (inner and outer)
        this.alleles = value.replace(/\s/g,'')
    }

    evaluate(correctPhenotype, organism) {
        var trait = BiologicaX.getTrait(organism, this.target);
        if (!trait) {
            throw new Error("Unable to find '" + this.target 
                + "' characteristic in '" + organism.species.name + "' species.")
        }
        var alleles = organism.genetics.getAlleleStringForTrait(trait);
        if (!alleles) {
            throw new Error("Unable to alleles for '" + this.target 
                + "' characteristic in '" + organism.species.name + "' species.")
        }

        var correctCharacterisitic = BiologicaX.getCharacteristicFromPhenotype(correctPhenotype, trait);

        return this.target.toLowerCase() == correctCharacterisitic.toLowerCase() 
                &&  alleles.includes(this.alleles);
    }
}

class SexRule extends Rule {
    constructor(priority, target, value, concepts, hints) {
        super(priority, target, value, concepts, hints);
        
        // Remove all whitespace (inner and outer)
        this.alleles = value.replace(/\s/g,'')
    }

    evaluate(correctPhenotype, organism) {
        var trait = BiologicaX.getTrait(organism, this.target);
        if (!trait) {
            throw new Error("Unable to find '" + this.target 
                + "' characteristic in '" + organism.species.name + "' species.")
        }
        var alleles = organism.genetics.getAlleleStringForTrait(trait);
        if (!alleles) {
            throw new Error("Unable to alleles for '" + this.target 
                + "' characteristic in '" + organism.species.name + "' species.")
        }

        var correctCharacterisitic = BiologicaX.getCharacteristicFromPhenotype(correctPhenotype, trait);

        return this.target.toLowerCase() == correctCharacterisitic.toLowerCase() 
                &&  alleles.includes(this.alleles);
    }
}

module.exports = EcdRulesEvaluator;