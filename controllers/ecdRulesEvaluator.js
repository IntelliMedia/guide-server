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
            
            var activatedRules = this.evaluateRules(
                event.context.editableGenes,
                event.context.correctPhenotype, 
                event.context.targetSex, 
                organism);

            var negativeConcepts = this.updateStudentModel(student, activatedRules);

            var action = null;
            if (!event.context.correct) {
                action = this.selectHint(student, event.context.challengeId, negativeConcepts)
            } else {
                console.info("No need to send hint, organism is correct for user: %s", student.id);
            }  

            resolve(action);
        });
    }

    evaluateRules(editableTraits, correctPhenotype, correctSex, organism) {
        var activatedRules = {
            correct: [],
            misconceptions: []
        }

        // Evaluate selectedAlleles
        for (let trait of editableTraits) {
            var correctCharacterisitic = BiologicaX.getCharacteristicFromPhenotype(correctPhenotype, trait);
            for (let rule of this.rules) {
                if (rule instanceof AlleleRule && rule.evaluate(correctCharacterisitic, organism)) {
                    if (!rule.isMisconception) {
                        activatedRules.correct.push(rule);
                    } else {
                       activatedRules.misconceptions.push(rule);
                    }
                }
            }
        }

        for (let rule of this.rules) {
            if (rule instanceof SexRule && rule.evaluate(correctSex, organism)) {
                if (!rule.isMisconception) {
                    activatedRules.correct.push(rule);
                } else {
                    activatedRules.misconceptions.push(rule);
                }
            }
        }

        activatedRules.correct = this.sortRulesByPriority(activatedRules.correct);
        activatedRules.misconceptions = this.sortRulesByPriority(activatedRules.misconceptions);

        return activatedRules;
    }

    updateStudentModel(student, activatedRules) {
        var negativeConcepts = [];

        for (let rule of activatedRules.correct) {
            for (var conceptId in rule.concepts) {
                if (!rule.concepts.hasOwnProperty(conceptId)) {
                    continue;
                }
                var adjustment = rule.concepts[conceptId];
                student.conceptState(rule.target, conceptId).value += adjustment;
                console.info("Adjusted student model concept: " + conceptId + " adjustment=" + adjustment);
            }
        }

        for (let rule of activatedRules.misconceptions) {
            for (var conceptId in rule.concepts) {
                if (!rule.concepts.hasOwnProperty(conceptId)) {
                    continue;
                }
                var adjustment = rule.concepts[conceptId];
                var state = student.conceptState(rule.target, conceptId);
                state.value += adjustment;
                // TODO - only include negative concept state values?
                if (state.value < 0) {
                    negativeConcepts.push(new NegativeConcept(
                        conceptId, 
                        state.value, 
                        rule)); 
                }
                console.info("Adjusted student model concept: " + conceptId + " adjustment=" + adjustment);
            }
        }

        // Sort by priority (highest to lowest) and then concept score (lowest to highest)
        return negativeConcepts.sort(function(a, b) {
            if (b.rule.priority != a.rule.priority) {
                return b.rule.priority - a.rule.priority;
            } else {
                return a.value - b.value;
            }
        });
    } 

    selectHint(student, challengeId, negativeConcepts) {
        console.info("Select hint for: %s", student.id);
        if (!negativeConcepts || negativeConcepts.length == 0) {
            console.info("No need to hint. No negative concepts for user: " + student.id);
        }

        var hints = null;

        // Prioritize the most recently hinted concept (don't jump around between hints)
        var hintDelivered = student.mostRecentHint(challengeId);
        for (let negativeConcept of negativeConcepts) {

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

    getHint(student, session, event) {
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

        return rules;
    }

    sortRulesByPriority(rules) {
        return rules.sort(function(a, b) {
            return b.priority - a.priority;
        });
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
                concepts[headerRow[i]] = this.asNumber(value);
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

        if (target.includes("priority")
            || target.includes("ruletype")
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

class NegativeConcept {
    constructor(conceptId, value, rule) {
        this.conceptId = conceptId;
        this.value = value;
        this.rule = rule;
    }
}

class Rule {   
    constructor(priority, target, value, concepts, hints) {
        this.priority = priority;
        this.target = target;
        this.value = value;
        this.concepts = concepts;
        this.hints = hints;

        var totalAdjustment = 0;
        for (var concept in this.concepts) {
            if (!this.concepts.hasOwnProperty(concept)) {
                continue;
            }
            totalAdjustment += this.concepts[concept];
        }
        this.isMisconception = totalAdjustment < 0;
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

    evaluate(correctCharacterisitic, organism) {
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

        return this.target.toLowerCase() == correctCharacterisitic.toLowerCase() 
                &&  alleles.includes(this.alleles);
    }
}

class SexRule extends Rule {
    constructor(priority, target, value, concepts, hints) {
        super(priority, target, value, concepts, hints);
        
        // Remove all whitespace (inner and outer)
        this.targetSex = (this.target.toLowerCase() == "female" ? BioLogica.FEMALE : BioLogica.MALE);
        this.sex = (this.value.toLowerCase() == "female" ? BioLogica.FEMALE : BioLogica.MALE);
    }

    evaluate(correctSex, organism) {

        return correctSex == this.targetSex && this.sex == organism.sex;
    }
}

module.exports = EcdRulesEvaluator;