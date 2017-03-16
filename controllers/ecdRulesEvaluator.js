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

    updateStudentModelAsync(student, session, event) {
        return new Promise((resolve, reject) => {
            console.info("Update student model for: %s (%s | %s)", student.id, session.groupId, event.context.challengeId);
            var targetSpecies = BioLogica.Species[event.context.species];

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

            resolve(this);
        });
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

    getHintAsync(student, session, event) {
        return new Promise((resolve, reject) => {
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

            var dialogMessage = null;
            if (hints) {
                student.hintHistory.push({
                    challengeId: event.context.challengeId,
                    characteristic: hintCharacteristic, 
                    conceptId: hintConceptId,
                    hintLevel: hintLevel,
                    timestamp: new Date()
                });
                dialogMessage = new GuideProtocol.Text(
                    'ITS.CONCEPT.FEEDBACK',
                    hints[hintLevel]);
                dialogMessage.args.trait = BiologicaX.findTraitForCharacteristic(hintCharacteristic);
            }

            resolve(dialogMessage);
        });
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
        var rowCount = csv.length;
        for (var i = 1; i < rowCount; ++i) {
            var currentRow = csv[i];
            var newRule = 
            {
                conceptModifiers: {},
                hints: []
            };
            for (var j = 0; j < columnCount; ++j) {
                var columnName = headerRow[j];
                var value = currentRow[j].trim();
                if (this.isConceptId(columnName)) {
                    newRule.conceptModifiers[columnName] = (value ? Number(value) : 0);
                } else if (this.isHint(columnName)) {
                    newRule.hints.push(value);
                } else {
                    newRule[columnName.toLowerCase()] = value;
                }
            }
            rules.push(newRule);
        }

        return rules;
    }

    isConceptId(text) {
        var target = text.toLowerCase();

        if (target.includes("inheritancepattern")
            || target.includes("target")
            || target.includes("allele")
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

module.exports = EcdRulesEvaluator;