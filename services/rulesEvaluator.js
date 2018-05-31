'use strict';

const RulesRepository = require('../storage/rulesRepository');
const RuleCondition = require('../models/ruleCondition');
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
        this.studentModelService = new StudentModelService();
    }

    initializeAsync(session, groupName, tags) {
        return Group.getCollectionIdsAsync(groupName, tags).then((ids) => {
            if (ids.length == 0) {
                session.warningAlert("Unable to find Google Sheet with tags (" + tags + ") in  group '" + groupName + "'");
            }

            return this.rulesRepository.loadCollectionsAsync(ids);
        })
        .then(() => this.studentModelService.initializeAsync(groupName));
    }    

    evaluateAsync(student, session, event) {
        return new Promise((resolve, reject) => {
            try {
                let challengeId = event.context.challengeId;
                session.debugAlert("Evaluate rules for: {0} ({1} | {2} | {3})".format(student.id, session.classId, session.groupId, challengeId));                
                
                let savePromises = [];
                let rulesFiredMsgs = [];

                let activatedRules = this.evaluateRules(session, event);

                if (activatedRules.length > 0) {           
                    for (let rule of activatedRules) {
                        for (let conceptId in rule.concepts) { 
                            savePromises.push(this.studentModelService.processConceptDataPoint(
                                student,
                                session,
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

                savePromises.push(this.studentModelService.updateDashboardAsync(student, session));
                
                resolve(Promise.all(savePromises));

            } catch(err) {
                reject(err);
            }
        });
    }

    evaluateRules(session, event) {

        let attributesToEvaluate = this._selectableAndChangedAttributes(event);
        let attributeNames = attributesToEvaluate.length > 0 ? attributesToEvaluate.join(",") : "none";
        session.debugAlert("Attributes to evaluate: " + attributeNames);

        let activatedRules = []
        for (let rule of this.rulesRepository.objs) {
            let attribute = rule.attribute;
            if (attribute === undefined || attribute === "n/a" || attributesToEvaluate.indexOf(attribute) >= 0) {
                if (rule.evaluate(event)) {
                    activatedRules.push(rule);
                }
            }
        }

        activatedRules = this.sortRulesByPriority(activatedRules);
        
        return activatedRules;
    }

    _selectableAndChangedAttributes(event) {
        // Minimally, we need to know which attributes were editable in the client
        if (event.context && event.context.selectableAttributes === undefined) {
            return [];
        }

        // If the event doesn't include previous values, assume all the 
        // selectable attributes could have been changed.
        if (event.context && event.context.previous === undefined) {
            return event.context.selectableAttributes;
        }

        return event.context.selectableAttributes.filter((attribute) => {
            return this._hasSelectionChanged(attribute, event);
        });
    }

    _hasSelectionChanged(attribute, event) {
        if (event.context.selectableAttributes === undefined) {
            throw new Error("context.selectableAttributes not defined.");
        }

        if (this.attribute === "sex") {
            return RuleCondition.SexCondition.hasSelectionChanged(event);
        } else {
            return RuleCondition.AllelesCondition.hasSelectionChanged(event, attribute);
        }

        return true;
    }

    sortRulesByPriority(rules) {
        return rules.sort(function(a, b) {
            return b.priority - a.priority;
        });
    }
}

module.exports = RulesEvaluator;