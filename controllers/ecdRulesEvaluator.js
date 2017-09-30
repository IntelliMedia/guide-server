'use strict';

const rp = require('request-promise');
const parse = require('csv-parse');
const StudentModelService = require('./studentModelService');
const Group = require('../models/Group');
const TutorAction = require('../models/TutorAction');
const EcdCsvParser = require("./ecdCsvParser");
const stringx = require("../utilities/stringx");
const DashboardService = require('./dashboardService');

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
        this.studentModelService = null;
    }

    evaluateAsync(student, session, event) {
        return new Promise((resolve, reject) => {
            try {
                let challengeId = event.context.challengeId;
                session.debugAlert("Evaulte rules for: {0} ({1} | {2} | {3})".format(student.id, session.classId, session.groupId, challengeId));                
                
                var activatedRules = this.evaluateRules(event);

                this.studentModelService = new StudentModelService(student, session, challengeId);
                var negativeConcepts = this.studentModelService.updateStudentModel(activatedRules);

                var conceptToHint = null;
                if (!event.context.correct) {
                    conceptToHint = this.studentModelService.selectHint(negativeConcepts)
                } else {
                    session.debugAlert("No need to send hint, organism is correct for user: %s", student.id);
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
                    action.context.selectionCriteria = conceptToHint.selectionCriteria;
                    action.context.challengeId = challengeId;
                    action.context.ruleId = conceptToHint.rule.id;
                    action.context.ruleSource = conceptToHint.rule.source;
                }

                if (student.learnPortalEndpoint) {
                    let dashboardService = new DashboardService();
                    let updatePromise = dashboardService.updateStudentDataAsync(student.studentModel, student.learnPortalEndpoint)
                    .then(() => {
                        return action;
                    })
                    .catch((err) => {
                        session.errorAlert("Unable to upload to dashboard. " + err.toString());
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

    evaluateRules(event) {

        var activatedRules = {
            correct: [],
            misconceptions: []
        }

        for (let rule of this.rules) {
            if (rule.evaluate(event)) {
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
}

module.exports = EcdRulesEvaluator;