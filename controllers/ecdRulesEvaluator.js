'use strict';

const rp = require('request-promise');
const parse = require('csv-parse');
const Group = require('../models/Group');
const TutorAction = require('../models/TutorAction');
const EcdCsvParser = require("./ecdCsvParser");


/**
 * This class uses ECD-derived rules to evaluate student moves
 * and to provide move-specific hints.
 */
class EcdRulesEvaluator {
    constructor(source, csv) {
        var parser = new EcdCsvParser();
        this.rules = parser.convertCsvToRules(csv);
        this.rules.forEach((rule) => {
            rule.source = source;
        });
    }

    evaluateAsync(student, session, event) {
        return new Promise((resolve, reject) => {
            try {
                console.info("Update student model for: %s (%s | %s | %s)", student.id, session.classId, session.groupId, event.context.challengeId);                
                var activatedRules = this.evaluateRules( 
                    event.context.challengeCriteria,
                    event.context.userSelections);

                var negativeConcepts = this.updateStudentModel(student, activatedRules);

                var action = null;
                if (!event.context.correct) {
                    action = this.selectHint(student, session, event.context.challengeId, negativeConcepts)
                } else {
                    console.info("No need to send hint, organism is correct for user: %s", student.id);
                }  

                resolve(action);
            } catch(err) {
                reject(err);
            }
        });
    }

    evaluateRules(challengeAttributes, userSelections) {

        var activatedRules = {
            correct: [],
            misconceptions: []
        }

        for (let rule of this.rules) {
            if (rule.evaluate(challengeAttributes, userSelections)) {
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

    sortRulesByPriority(rules) {
        return rules.sort(function(a, b) {
            return b.priority - a.priority;
        });
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
                student.updateConceptState(rule.criteria(), conceptId, adjustment);
                console.info("+Rule Triggered -> ruleId: %s conceptId: %s adjustment: %d", 
                    rule.id, conceptId, adjustment);
            }
        }

        for (let rule of activatedRules.misconceptions) {
            for (var conceptId in rule.concepts) {
                if (!rule.concepts.hasOwnProperty(conceptId)) {
                    continue;
                }
                var adjustment = rule.concepts[conceptId];
                student.updateConceptState(rule.criteria(), conceptId, adjustment);
                var scaledScore = student.conceptScaledScore(rule.criteria(), conceptId);
                // TODO - only include negative concept state scores?
                //if (state.scaledScore < 0) {
                    negativeConcepts.push(new NegativeConcept(
                        conceptId, 
                        scaledScore, 
                        rule)); 
                //}
                console.info("-Rule Triggered -> ruleId: %s conceptId: %s adjustment: %d", 
                    rule.id, conceptId, adjustment);            }
        }

        // Sort by priority (highest to lowest) and then concept score (lowest to highest)
        return negativeConcepts.sort(function(a, b) {
            if (b.rule.priority != a.rule.priority) {
                return b.rule.priority - a.rule.priority;
            } else {
                return a.scaledScore - b.scaledScore;
            }
        });
    } 

    selectHint(student, session, challengeId, negativeConcepts) {
        console.info("Select hint for: %s", student.id);

        if (!negativeConcepts || negativeConcepts.length == 0) {
            console.info("No need to hint. No negative concepts for user: " + student.id);
            return null;
        }

        var conceptToHint = null;
        var selectionCriteria = null;

        // Prioritize the most recently hinted concept (don't jump around between hints)
        var mostRecentHint = student.mostRecentHint(challengeId);
        if (mostRecentHint) {
            for (let negativeConcept of negativeConcepts) {
                if (negativeConcept.rule.criteria() == mostRecentHint.ruleCriteria
                    && negativeConcept.rule.selected() == mostRecentHint.ruleSelected) {
                        conceptToHint = negativeConcept;
                        selectionCriteria = {
                            description:"staying with previous hint",
                            conceptId:conceptToHint.conceptId,
                            scaledScore:conceptToHint.scaledScore
                        };
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
                    selectionCriteria = {
                      description:"most negative concept",
                      ruleCriteria:conceptToHint.rule.criteria(),
                      ruleSelected:conceptToHint.rule.selected()
                    };
                    break;
                } else {
                    console.warn("No hints available for %s | %s | %s", 
                        challengeId,
                        negativeConcept.rule.criteria(),
                        negativeConcept.rule.selected());
                }
            }
        }

        var action = null;
        if (conceptToHint != null) {
            var hintLevel = student.currentHintLevel(
                    challengeId,
                    conceptToHint.rule.criteria(), 
                    conceptToHint.rule.selected()) + 1;

            // Don't let hint level exceed the number of hints available
            hintLevel = Math.min(conceptToHint.rule.hints.length, hintLevel);
            var hintText = conceptToHint.rule.hints[hintLevel - 1];

            student.addHintToHistory(
                conceptToHint.conceptId, 
                conceptToHint.scaledScore, 
                challengeId, 
                conceptToHint.rule.criteria(), 
                conceptToHint.rule.selected(), 
                hintLevel);

            var dialogMessage = new GuideProtocol.Text(
                'ITS.CONCEPT.FEEDBACK',
                hintText);
            if (conceptToHint.rule.attributeName) {
                dialogMessage.args.trait = conceptToHint.rule.attributeName;
            } else {
                dialogMessage.args.trait = conceptToHint.rule.criteria();
            }

            var reason = {
                why: "MisconceptionDetected",
                ruleId: conceptToHint.rule.id,
                ruleSource: conceptToHint.rule.source
            };
            action = TutorAction.create(session, "SPOKETO", "USER", "hint",
                        new GuideProtocol.TutorDialog(dialogMessage, reason));
            action.context.hintLevel = hintLevel;
            action.context.selectionCriteria = selectionCriteria;
            action.context.challengeId = challengeId;
            action.context.ruleId = conceptToHint.rule.id;
            action.context.ruleSource = conceptToHint.rule.source;
        }

        return action;
    }
}

class NegativeConcept {
    constructor(conceptId, scaledScore, rule) {
        this.conceptId = conceptId;
        this.scaledScore = scaledScore;
        this.rule = rule;
    }
}

module.exports = EcdRulesEvaluator;