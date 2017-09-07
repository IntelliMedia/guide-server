'use strict';

const Student = require('../models/Student');
const StudentModel = require('../models/StudentModel');

class NegativeConcept {
    constructor(conceptId, score, rule) {
        this.conceptId = conceptId;
        this.score = score;
        this.rule = rule;
    }
}

/**
 * This class takes raw rule results and updates a student's StudentModel
 * and records concept changes.
 */
class StudentModelService {
    constructor(student, session, challengeId) {
        this.student = student;
        this.studentModel = student.studentModel;
        this.session = session;
        this.challengeId = challengeId;
        this.timestamp = null;
    }

    updateStudentModel(activatedRules) {
        this.session.debugAlert("Update student model for: " + this.student.id);

        this.timestamp = new Date();
        var negativeConcepts = [];
        var rulesFired = [];

        for (let rule of activatedRules.correct) {
            for (var conceptId in rule.concepts) {
                if (!rule.concepts.hasOwnProperty(conceptId)) {
                    continue;
                }
                var adjustment = rule.concepts[conceptId];
                this.processConceptDataPoint(conceptId, true, this.challengeId, rule.trait, this.timestamp);
                rulesFired.push("+Rule Triggered: {0} -> {1} | ruleId: {2} source: {3}".format( 
                    conceptId, adjustment, rule.id, rule.source));
            }
        }

        for (let rule of activatedRules.misconceptions) {
            for (let conceptId in rule.concepts) {
                if (!rule.concepts.hasOwnProperty(conceptId)) {
                    continue;
                }
                let adjustment = rule.concepts[conceptId];
                this.processConceptDataPoint(conceptId, false, this.challengeId, rule.trait, this.timestamp);
                let score = this.getScore(conceptId, this.challengeId);
                // TODO - only include negative concept state scores?
                //if (state.score < 0) {
                    negativeConcepts.push(new NegativeConcept(
                        conceptId, 
                        score, 
                        rule)); 
                //}
                rulesFired.push("-Rule Triggered: {0} -> {1} | ruleId: {2} source: {3}".format( 
                    conceptId, adjustment, rule.id, rule.source));            
            }
        }

        var msg = (rulesFired.length == 0 ? "no rules fired" : rulesFired.length + " rules fired\n" + rulesFired.join("\n"));
        this.session.debugAlert("Rules Triggered: " + msg);

        // Sort by priority (highest to lowest) and then concept score (lowest to highest)
        return negativeConcepts.sort(function(a, b) {
            if (b.rule.priority != a.rule.priority) {
                return b.rule.priority - a.rule.priority;
            } else {
                return a.score - b.score;
            }
        });
    }
    
    selectHint(negativeConcepts) {

        if (!negativeConcepts || negativeConcepts.length == 0) {
            this.session.debugAlert("No need to hint. No negative concepts for user: " + this.student.id);
            return null;
        }

        this.session.debugAlert("Select hint for: " + this.student.id);

        var conceptToHint = null;
        var selectionCriteria = null;

        // Prioritize the most recently hinted concept (don't jump around between hints)
        var mostRecentHint = this.studentModel.mostRecentHint(this.challengeId);
        if (mostRecentHint) {
            for (let negativeConcept of negativeConcepts) {
                if (negativeConcept.rule.criteria() == mostRecentHint.ruleCriteria
                    && negativeConcept.rule.selected() == mostRecentHint.ruleSelected) {
                        conceptToHint = negativeConcept;
                        selectionCriteria = {
                            description:"staying with previous hint",
                            conceptId:conceptToHint.conceptId,
                            score:conceptToHint.score
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
                    this.session.warningAlert("No hints available for {0} | {1} | {2}".format(
                        this.challengeId, 
                        negativeConcept.rule.criteria(), 
                        negativeConcept.rule.selected()));
                }
            }
        }

        if (conceptToHint != null) {
            conceptToHint.hintLevel = this.studentModel.currentHintLevel(
                    this.challengeId,
                    conceptToHint.rule.criteria(), 
                    conceptToHint.rule.selected()) + 1;

            conceptToHint.selectionCriteria = selectionCriteria;

            // Don't let hint level exceed the number of hints available
            conceptToHint.hintLevel = Math.min(conceptToHint.rule.hints.length, conceptToHint.hintLevel);
            conceptToHint.Text = conceptToHint.rule.hints[conceptToHint.hintLevel - 1];

            this.studentModel.addHintToHistory(
                conceptToHint.conceptId, 
                conceptToHint.score, 
                this.challengeId,
                conceptToHint.rule.trait, 
                conceptToHint.rule.criteria(), 
                conceptToHint.rule.selected(), 
                conceptToHint.hintLevel);

            this.updateHintTotals(conceptToHint.conceptId, this.challengeId, conceptToHint.rule.trait, this.timestamp);
        }

        return conceptToHint;
    }

    getScore(conceptId, challengeId) {
        return this.studentModel.getConceptByChallenge(conceptId, challengeId).score;
    }

    processConceptDataPoint(conceptId, isCorrect, challengeId, trait, timestamp) {
        this.updateConceptState(this.studentModel.getConceptAggregated(conceptId), isCorrect);
        this.updateConceptState(this.studentModel.getConceptByChallenge(conceptId, challengeId), isCorrect);
        this.updateConceptState(this.studentModel.getConceptByTrait(conceptId, trait), isCorrect);
        this.updateConceptState(this.studentModel.getConceptSnapshot(conceptId, timestamp), isCorrect);
    }

    updateConceptState(conceptState, isCorrect) {
        conceptState.totalCorrect += (isCorrect ? 1 : 0);
        conceptState.totalAttempts++;
        conceptState.score = conceptState.totalCorrect / conceptState.totalAttempts;     
    }

    updateHintTotals(conceptId, challengeId, trait, timestamp) {
        this.studentModel.getConceptAggregated(conceptId).totalHintsDelivered++;
        this.studentModel.getConceptByChallenge(conceptId, challengeId).totalHintsDelivered++;
        this.studentModel.getConceptByTrait(conceptId, trait).totalHintsDelivered++;
        this.studentModel.getConceptSnapshot(conceptId, timestamp).totalHintsDelivered++;
    }
}

module.exports = StudentModelService;