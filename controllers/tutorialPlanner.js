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
        // Hint delivery order of preference:
        // On incorrect selection:
        // - Is hint available?
        // - Hint previously delivered for concept/trait IF BKT score is below threshold
        // - Hint for concept/trait IF BKT score below threshold (ordered by lowest score)

        let challengeId = event.context.challengeId;
        let studentModelService = new StudentModelService(this.student, this.session, challengeId);   
        let misconceptions = this.student.studentModel.getMisconceptionsForEvent(event);
        if (misconceptions.length > 0) {
            misconceptions.forEach((misconception) => {
                let concept = this.student.studentModel.getConceptByTrait(misconception.conceptId, misconception.trait);
                misconception.score = concept.score;
            });

            let mostRecentHint = this.student.studentModel.mostRecentHint(challengeId);
            return this._selectHintAsync(event.context.groupId, challengeId, misconceptions, mostRecentHint);
        }
        
        return Promise.resolve(null);
    }

    _selectHintAsync(groupId, challengeId, misconceptions, mostRecentHint) {
        console.info("Observed incorrect concepts:");
        misconceptions = this._sortMisconceptionsByPreviousHintAndThenAscendingScore(misconceptions, mostRecentHint);
        for (let misconception of misconceptions) {
            console.info("   " + misconception.conceptId + " | " + misconception.trait + " | " + misconception.score + " | " + misconception.source);
        }

        let conceptHintsRepository = new ConceptHintsRepository(this.session);
        return conceptHintsRepository.loadAsync(groupId).then(() => {
            for (let misconception of misconceptions) {
                let conceptHints = conceptHintsRepository.find("Sim", misconception.conceptId);
                if (conceptHints && conceptHints.length > 0) {
                    let conceptHint = conceptHints[0];
                    return this._createHintAction(
                        conceptHint.hints[0],
                        9,
                        misconception.trait,
                        challengeId,
                        "Rule: " + misconception.source + "\nHint: " + conceptHint.source
                    );
                }
            }
            return null;
        });        
    };

    _sortMisconceptionsByPreviousHintAndThenAscendingScore(misconceptions, mostRecentHint) {
        return misconceptions.sort(function(a, b) {
            if (mostRecentHint && a.conceptId == b.conceptId) {
                return (a.conceptId == mostRecentHint.conceptId ? 1 : -1);
            } else {
                return a.score -  b.score;
            }
        });
    }

    _createHintAction(hintText, hintLevel, trait, challengeId, source) {        
        let dialogMessage = new GuideProtocol.Text(
            'ITS.CONCEPT.FEEDBACK',
            hintText);
        dialogMessage.args.trait = trait;

        let reason = {
            why: "MisconceptionDetected",
            source: source,
            trait: trait
        };
        let action = TutorAction.create(this.session, "SPOKETO", "USER", "hint",
                    new GuideProtocol.TutorDialog(dialogMessage, reason));
        action.context.hintLevel = hintLevel;
        action.context.challengeId = challengeId;
        action.context.source = source;    

        return action;
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
}

module.exports = TutorialPlanner;