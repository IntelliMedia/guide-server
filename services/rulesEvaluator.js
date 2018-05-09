'use strict';

const RulesRepository = require('../storage/rulesRepository');
const StudentModelService = require('./studentModelService');
const Group = require('../models/Group');
const TutorAction = require('../models/TutorAction');
const stringx = require("../utilities/stringx");
const DashboardService = require('./dashboardService');

/**
 * This class uses ECD-derived rules to evaluate student moves
 * and to provide move-specific hints.
 */
class RulesEvaluator {
    constructor() {
        this.rulesRepository = new RulesRepository(global.cacheDirectory);
    }

    initializeAsync(session, groupName, tags) {
        return Group.getCollectionIdsAsync(groupName, tags).then((ids) => {
            if (ids.length == 0) {
                session.warningAlert("Unable to find Google Sheet with tags (" + tags + ") in  group '" + groupName + "'");
            }

            return this.rulesRepository.loadCollectionsAsync(ids);
        });
    }    

    evaluateAsync(student, session, event) {
        return new Promise((resolve, reject) => {
            try {
                let challengeId = event.context.challengeId;
                session.debugAlert("Evaluate rules for: {0} ({1} | {2} | {3})".format(student.id, session.classId, session.groupId, challengeId));                
                
                let savePromises = [];
                let rulesFiredMsgs = [];

                let activatedRules = this.evaluateRules(event);
                if (activatedRules.length > 0) {
                    let studentModelService = new StudentModelService(student, session, challengeId);              
                    for (let rule of activatedRules) {
                        for (let conceptId in rule.concepts) { 
                            savePromises.push(studentModelService.processConceptDataPoint(
                                conceptId, 
                                rule.isCorrect, 
                                challengeId, 
                                rule.attribute, 
                                rule.substitutionVariables(),
                                event.time, 
                                RulesRepository.sourceAsUrl(rule)));

                            rulesFiredMsgs.push("Rule Triggered ->  Correct:{0} | {1} | {2} | rule: {3}".format( 
                                rule.isCorrect, conceptId, rule.attribute, RulesRepository.sourceAsUrl(rule)));
                        }
                    }                
                }

                var msg = (rulesFiredMsgs.length == 0 ? "no rules fired" : rulesFiredMsgs.length + " rules fired\n" + rulesFiredMsgs.join("\n"));
                session.debugAlert("Rules Triggered: " + msg);
                resolve(Promise.all(savePromises));

            } catch(err) {
                reject(err);
            }
        });
    }

    evaluateRules(event) {

        var activatedRules = []
        for (let rule of this.rulesRepository.objs) {
            if (rule.evaluate(event)) {
                 activatedRules.push(rule);
            }
        }

        activatedRules = this.sortRulesByPriority(activatedRules);
        
        return activatedRules;
    }

    sortRulesByPriority(rules) {
        return rules.sort(function(a, b) {
            return b.priority - a.priority;
        });
    }
}

module.exports = RulesEvaluator;