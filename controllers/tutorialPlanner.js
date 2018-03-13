'use strict';

const rp = require('request-promise');
const parse = require('csv-parse');
const StudentModelService = require('./studentModelService');
const ConceptHintsRepository = require('./conceptHintsRepository');
const Group = require('../models/Group');
const TutorAction = require('../models/TutorAction');
const stringx = require("../utilities/stringx");
const DashboardService = require('./dashboardService');

/**
 * This class decides whether or not to issue a hint based on the student model.
 */
class TutorialPlanner {
    constructor(student, session) {
        this.student = student;
        this.session = session;
    }

    evaluateAsync(event) {
        let studentModelService = new StudentModelService(this.student, this.session, event.challengeId);  
        return studentModelService.incorrectConceptsAsync(event).then((observations) => {
            if (observations && observations.length > 0) {
                console.info("Observed incorrect concepts:");
                for (let observation of observations) {
                    console.info("   " + observation.conceptId + " | " + observation.trait);
                }

                let conceptHintsRepository = new ConceptHintsRepository();
                // TODO get hints, cross refernce with current wrong answer AND most recent hint 
            }
        });
    }

    /*
        return new Promise((resolve, reject) => {
            try {
                let studentModelService = new StudentModelService(student, session, challengeId);
                var negativeConcepts = studentModelService.updateStudentModel(activatedRules);

                var conceptToHint = null;
                if (!event.context.correct) {
                    conceptToHint = this.studentModelService.selectHint(negativeConcepts)
                } else {
                    session.debugAlert("No need to send hint, organism is correct for user: " + student.id);
                }  

                var action = null;
                if (conceptToHint != null) {
        
                    var dialogMessage = new GuideProtocol.Text(
                        'ITS.CONCEPT.FEEDBACK',
                        conceptToHint.Text);
                    if (conceptToHint.rule.trait) {
                        dialogMessage.args.trait = conceptToHint.rule.trait;
                    } else {
                        dialogMessage.args.trait = conceptToHint.rule.conditionsAsString();
                    }
        
                    var reason = {
                        why: "MisconceptionDetected",
                        ruleId: conceptToHint.rule.id,
                        ruleSource: conceptToHint.rule.source,
                        trait: conceptToHint.rule.trait
                    };
                    action = TutorAction.create(session, "SPOKETO", "USER", "hint",
                                new GuideProtocol.TutorDialog(dialogMessage, reason));
                    action.context.hintLevel = conceptToHint.hintLevel;
                    action.context.selectionTarget = conceptToHint.selectionTarget;
                    action.context.challengeId = challengeId;
                    action.context.ruleId = conceptToHint.rule.id;
                    action.context.ruleSource = conceptToHint.rule.source;
                }

                if (student.learnPortalEndpoint) {
                    let dashboardService = new DashboardService();
                    let updatePromise = dashboardService.updateStudentDataAsync(session, student.studentModel, student.learnPortalEndpoint)
                        .then(() => {
                            return action;
                        })
                        .catch((err) => {
                            // It's ok for the dashboard push to fail, we should continue to return an action
                            return action;
                        });

                    resolve(updatePromise);
                }
                else
                {
                    resolve(action);
                }

            } catch(err) {
                reject(err);
            }
        });
    }
    */

    evaluateRules(event) {

        var activatedRules = {
            correct: [],
            misconceptions: []
        }

        for (let rule of this.rules) {
            if (rule.evaluate(event)) {
                if (rule.isCorrect) {
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
}

module.exports = TutorialPlanner;