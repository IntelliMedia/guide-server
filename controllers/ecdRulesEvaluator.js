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
            try {
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
            } catch(err) {
                reject(err);
            }
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
        console.info("Update student model for: %s", student.id);
        var negativeConcepts = [];

        for (let rule of activatedRules.correct) {
            for (var conceptId in rule.concepts) {
                if (!rule.concepts.hasOwnProperty(conceptId)) {
                    continue;
                }
                var adjustment = rule.concepts[conceptId];
                var state = student.conceptState(rule.target, conceptId);
                state.score += adjustment;
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
                state.score += adjustment;
                // TODO - only include negative concept state scores?
                //if (state.score < 0) {
                    negativeConcepts.push(new NegativeConcept(
                        conceptId, 
                        state.score, 
                        rule)); 
                //}
                console.info("Adjusted student model concept: " + conceptId + " adjustment=" + adjustment);
            }
        }

        // Sort by priority (highest to lowest) and then concept score (lowest to highest)
        return negativeConcepts.sort(function(a, b) {
            if (b.rule.priority != a.rule.priority) {
                return b.rule.priority - a.rule.priority;
            } else {
                return a.score - b.score;
            }
        });
    } 

    selectHint(student, challengeId, negativeConcepts) {
        console.info("Select hint for: %s", student.id);

        if (!negativeConcepts || negativeConcepts.length == 0) {
            console.info("No need to hint. No negative concepts for user: " + student.id);
        }

        var conceptToHint = null;

        // Prioritize the most recently hinted concept (don't jump around between hints)
        var mostRecentHint = student.mostRecentHint(challengeId);
        if (mostRecentHint) {
            for (let negativeConcept of negativeConcepts) {
                if (negativeConcept.rule.target == mostRecentHint.ruleTarget
                    && negativeConcept.rule.selected == mostRecentHint.ruleSelected) {
                        conceptToHint = negativeConcept;
                        break;
                    }
            }
        }

        // If a hint wasn't previously given for the current concepts, select the
        // highest priority concept.
        if (conceptToHint == null) {
            for (let negativeConcept of negativeConcepts) {
                if (negativeConcept.rule.hints.length > 0) {
                    conceptToHint = negativeConcept;
                    break;
                } else {
                    console.warn("No hints available for %s | %s | %s", 
                        challengeId,
                        negativeConcept.rule.target,
                        negativeConcept.rule.selected);
                }
            }
        }

        var action = null;
        if (conceptToHint != null) {
            var hintLevel = student.currentHintLevel(
                    challengeId,
                    conceptToHint.rule.target, 
                    conceptToHint.rule.selected) + 1;

            // Don't let hint level exceed the number of hints available
            hintLevel = Math.min(conceptToHint.rule.hints.length, hintLevel);
            var hintText = conceptToHint.rule.hints[hintLevel - 1];

            student.addHintToHistory(
                conceptToHint.conceptId, 
                conceptToHint.conceptScore, 
                challengeId, 
                conceptToHint.rule.target, 
                conceptToHint.rule.selected, 
                hintLevel);

            var dialogMessage = new GuideProtocol.Text(
                'ITS.CONCEPT.FEEDBACK',
                hintText);
            if (conceptToHint.rule instanceof AlleleRule) {
                dialogMessage.args.trait = BiologicaX.findTraitForCharacteristic(conceptToHint.rule.target);
            } else {
                dialogMessage.args.trait = conceptToHint.rule.target;
            }
            action = new GuideProtocol.TutorDialog(dialogMessage);
        }

        return action;
    }

    convertCsvToRules(csv) {
        var currentRowIndex = 0;
        try { 
            var rules = [];

            var headerRow = csv[0];
            var columnCount = csv[0].length;
            var columnMap = {};
            for (var i = 0; i < columnCount; ++i) {
                columnMap[headerRow[i].toLowerCase().trim()] = i;
            }

            var rowCount = csv.length;
            for (var i = 1; i < rowCount; ++i) {
                currentRowIndex = i;
                var currentRow = csv[i];

                // Empty row?
                if (!this.asText(currentRow[0])) {
                    continue;
                }

                rules.push(Rule.create(
                    this.asNumber(this.getCell(currentRow, columnMap, "priority")),
                    this.asText(this.getCell(currentRow, columnMap, "ruletype")),
                    this.asText(this.getCell(currentRow, columnMap, "target")),
                    this.asText(this.getCell(currentRow, columnMap, "selected")),
                    this.extractConcepts(headerRow, currentRow),
                    this.extractHints(headerRow, currentRow)));
            }

            return rules;
        } catch(err) {
            var msg = "Unable to parse CSV row " + currentRowIndex + ". ";
            err.message = msg + err.message;
            throw err;
        }
    }

    sortRulesByPriority(rules) {
        return rules.sort(function(a, b) {
            return b.priority - a.priority;
        });
    }

    getCell(currentRow, columnMap, columnName) {
        if (!columnMap.hasOwnProperty(columnName) && columnMap[columnName] < currentRow.length) {
            throw new Error("Unable to find column named: " + columnName);
        }

        var value = currentRow[columnMap[columnName]];
        if (!value) {
            throw new Error("Unable to find value for column: " + columnName);
        }
        return value;
    }

    asText(value) {
        if (typeof value === "string") {
            value = value.trim();
        }
        return value;
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
                var value = currentRow[i].trim();
                if (value) {
                    hints.push(value);
                }
            }
         }
         return hints;
    }

    isConceptId(text) {
        var target = text.toLowerCase();

        if (target.includes("priority")
            || target.includes("ruletype")
            || target.includes("target")
            || target.includes("selected")
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
    constructor(conceptId, conceptScore, rule) {
        this.conceptId = conceptId;
        this.conceptScore = conceptScore;
        this.rule = rule;
    }
}

class Rule {   
    constructor(priority, target, selected, concepts, hints) {
        this.priority = priority;
        this.target = target;
        this.selected = selected;
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

    static create(priority, type, target, selected, concepts, hints) {
        var rule = null;
        switch(type.toLowerCase()) {
            case "allele":
                rule = new AlleleRule(priority, target, selected, concepts, hints);
                break;

            case "sex":
                rule = new SexRule(priority, target, selected, concepts, hints);
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
    constructor(priority, target, selected, concepts, hints) {
        super(priority, target, selected, concepts, hints);
        
        // Remove all whitespace (inner and outer)
        this.alleles = selected.replace(/\s/g,'')
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
    constructor(priority, target, selected, concepts, hints) {
        super(priority, target, selected, concepts, hints);
        
        // Remove all whitespace (inner and outer)
        this.targetSex = (this.target.toLowerCase() == "female" ? BioLogica.FEMALE : BioLogica.MALE);
        this.selectedSex = (this.selected.toLowerCase() == "female" ? BioLogica.FEMALE : BioLogica.MALE);
    }

    evaluate(correctSex, organism) {

        return correctSex == this.targetSex && this.selectedSex == organism.sex;
    }
}

module.exports = EcdRulesEvaluator;