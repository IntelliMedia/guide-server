'use strict';

const StudentModelService = require('./studentModelService');
const HintRecommender = require('./hintRecommender');
const RemediationRecommender = require('./remediationRecommender');

/**
 * This class decides whether or not to issue a hint based on the student model.
 */
class TutorialPlanner {
    constructor(student, session) {
        this.student = student;
        this.session = session;
    }

    // Returns action or null if the the tutor shouldn't take an action
    evaluateAsync(event) {

        // Future: add other possible tutorial actions (other than hinting) like 
        // outer loop problem selection recommendation.
        if (!event.context.correct) {
            let actionPromises = [];

            let hintRecommender = new HintRecommender();
            actionPromises.push(hintRecommender.evaluateAsync(this.student.studentModel, this.session, event));

            let remediationRecommender = new RemediationRecommender();
            actionPromises.push(remediationRecommender.evaluateAsync(this.student.studentModel, this.session, event));

            return Promise.all(actionPromises).then((results) => {
                // TODO: sort by priority
                let filteredAndSorted = results.filter((action) => action != null);
                return filteredAndSorted.length > 0 ? filteredAndSorted[0] : null;

                // Update student model with action
            //.then((action) => {
                        //     if (action.target == "HINT") {
                        //         let studentModelService = new StudentModelService(this.student, this.session, event.context.challengeId);
                        //         studentModelService.
                        //     }
                        // });
            });
        } else {
            this.session.debugAlert("No need to send hint, organism is correct for user: " + this.student.id);
            return null;
        }  
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
                    if (conceptToHint.rule.attribute) {
                        dialogMessage.args.attribute = conceptToHint.rule.attribute;
                    } else {
                        dialogMessage.args.attribute = conceptToHint.rule.conditionsAsString();
                    }
        
                    var reason = {
                        why: "MisconceptionDetected",
                        ruleId: conceptToHint.rule.id,
                        ruleSource: conceptToHint.rule.source,
                        attribute: conceptToHint.rule.attribute
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
}

module.exports = TutorialPlanner;