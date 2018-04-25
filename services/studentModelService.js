'use strict';

const Student = require('../models/Student');
const StudentModel = require('../models/StudentModel');
const ConceptObservation = require('../models/ConceptObservation');

class NegativeConcept {
    constructor(conceptId, scoreByChallenge, rule) {
        this.conceptId = conceptId;
        this.scoreByChallenge = scoreByChallenge;
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
    }

    incorrectConceptsAsync(event) {
      
        return ConceptObservation.find({
                timestamp: new Date(event.time), 
                studentId: event.studentId, 
                challengeId: event.context.challengeId, 
                isCorrect: false}).exec();
    }
    
    selectHint(negativeConcepts) {

        if (!negativeConcepts || negativeConcepts.length == 0) {
            this.session.debugAlert("No need to hint. No negative concepts for user: " + this.student.id);
            return null;
        }

        this.session.debugAlert("Select hint for: " + this.student.id);

        var conceptToHint = null;
        var selectionTarget = null;

        // Prioritize the most recently hinted concept (don't jump around between hints)
        var mostRecentHint = this.studentModel.mostRecentHint(this.challengeId);
        if (mostRecentHint) {
            for (let negativeConcept of negativeConcepts) {
                if (negativeConcept.rule.conditionsAsString() == mostRecentHint.ruleConditions) {
                        conceptToHint = negativeConcept;
                        selectionTarget = {
                            description:"staying with previous hint",
                            conceptId:conceptToHint.conceptId,
                            scoreByChallenge:conceptToHint.scoreByChallenge
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
                    selectionTarget = {
                      description:"most negative concept",
                      ruleConditions:conceptToHint.rule.conditionsAsString()
                    };
                    break;
                } else {
                    this.session.warningAlert("No hints available for {0} | {1}".format(
                        this.challengeId, 
                        negativeConcept.rule.conditionsAsString()));
                }
            }
        }

        if (conceptToHint != null) {
            conceptToHint.hintLevel = this.studentModel.currentHintLevel(
                    this.challengeId,
                    conceptToHint.rule.conditionsAsString()) + 1;

            conceptToHint.selectionTarget = selectionTarget;

            // Don't let hint level exceed the number of hints available
            conceptToHint.hintLevel = Math.min(conceptToHint.rule.hints.length, conceptToHint.hintLevel);
            let isBottomOutHint = (conceptToHint.hintLevel == conceptToHint.rule.hints.length);
            conceptToHint.Text = conceptToHint.rule.hints[conceptToHint.hintLevel - 1];

            this.studentModel.addHintToHistory(
                conceptToHint.conceptId, 
                conceptToHint.scoreByChallenge, 
                this.challengeId,
                conceptToHint.rule.attribute, 
                conceptToHint.rule.conditionsAsString(), 
                conceptToHint.hintLevel,
                isBottomOutHint);

            this.updateHintTotals(conceptToHint.conceptId, this.challengeId, conceptToHint.rule.attribute, this.timestamp, isBottomOutHint);
        }

        return conceptToHint;
    }

    updateDashboardAsync(student) {
        if (student.learnPortalEndpoint) {
            let dashboardService = new DashboardService();
            return dashboardService.updateStudentDataAsync(this.session, this.student.studentModel, this.student.learnPortalEndpoint)
                .then(() => {
                    return true;
                })
                .catch((err) => {
                    // It's ok for the dashboard push to fail, we should continue to return an action
                    return false;
                });
        }
        else
        {
            return Promise.resolve(true);
        }          
    }

    getScoreByChallenge(conceptId, challengeId) {
        return this.studentModel.getConceptByChallenge(conceptId, challengeId).score;
    }

    processConceptDataPoint(conceptId, isCorrect, challengeId, attribute, substitutionVariables, timestamp, source) {

        this.updateConceptState(this.studentModel.getConceptAggregated(conceptId), isCorrect);
        this.updateConceptState(this.studentModel.getConceptByChallenge(conceptId, challengeId), isCorrect);
        this.updateConceptState(this.studentModel.getConceptByAttribute(conceptId, attribute), isCorrect);
        //this.updateConceptState(this.studentModel.getConceptSnapshot(conceptId, timestamp), isCorrect);

        if (isCorrect != true) {
            this.studentModel.addMisconception(conceptId, challengeId, attribute, substitutionVariables, timestamp, source);
        }

        return ConceptObservation.record(timestamp, conceptId, attribute, this.student.id, challengeId, isCorrect);
    }

    updateConceptState(conceptState, isCorrect) {
        conceptState.totalCorrect += (isCorrect ? 1 : 0);
        conceptState.totalAttempts++;
        conceptState.score = conceptState.totalCorrect / conceptState.totalAttempts;     
    }

    updateHintTotals(conceptId, challengeId, attribute, timestamp, isBottomOutHint) {
        this.addHintTotals(this.studentModel.getConceptAggregated(conceptId), isBottomOutHint);
        this.addHintTotals(this.studentModel.getConceptByChallenge(conceptId, challengeId), isBottomOutHint);
        this.addHintTotals(this.studentModel.getConceptByAttribute(conceptId, attribute), isBottomOutHint);
        //this.addHintTotals(this.studentModel.getConceptSnapshot(conceptId, timestamp), isBottomOutHint);
    }

    addHintTotals(conceptState, isBottomOutHint) {
        conceptState.totalBottomOutHintsDelivered += (isBottomOutHint ? 1 : 0);
        conceptState.totalHintsDelivered++;     
    }
}

module.exports = StudentModelService;