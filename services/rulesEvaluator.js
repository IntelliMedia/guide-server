'use strict';

const Alert = require("../models/Alert");
const RuleCondition = require('../models/ruleCondition');
const StudentModelService = require('./studentModelService');
const RulesFactory = require('./rulesFactory');
const RulesRepository = require('../storage/rulesRepository');
const Group = require('../models/Group');
const TutorAction = require('../models/TutorAction');
const stringx = require("../utilities/stringx");
const DashboardService = require('./dashboardService');
const Biologica = require('../shared/biologica');
const Biologicax = require('../shared/biologicax');
const _ = require('lodash');

/**
 * This class uses ECD-derived rules to evaluate student moves
 * and to provide move-specific hints.
 */
class RulesEvaluator {
    constructor(student, session) {
        this.student = student;
        this.session = session;
        this.studentModelService = new StudentModelService();
    }

    evaluateAsync(event) {
        try {
            return this.studentModelService.initializeAsync(this.session.groupId)
                .then(() => this._loadRulesAsync(event))
                .then((rules) => this._evaluateRules(rules, event))
                .then((activatedRules) => this._updateStudentModelAsync(activatedRules, event));
        } catch(err) {
            return Promise.reject(err);
        }
    }

    _loadRulesAsync(event) {
        let rulesFactory = new RulesFactory();
        return rulesFactory.createRulesForEventAsync(this.session, event);
    }

    _evaluateRules(rules, event) {

        let activatedRules = [];

        if (rules.length > 0) {
            Alert.debug("Evaluating " + rules.length + " rules for event: " + event.toString(), this.session);
        } else {
            Alert.warning("No rules found for event: " + event.toString(), this.session);
            return activatedRules;
        }

        let challengeId = event.context.challengeId;
        console.log("Evaluate rules for: {0} ({1} | {2} | {3})".format(this.student.id, this.session.classId, this.session.groupId, challengeId));

        let attributesToEvaluate = this._selectableAttributes(event);
        let attributeNames = attributesToEvaluate.join(",");
        console.log("Selectable attributes: %s", attributeNames);

        if (attributesToEvaluate.length == 0
            && rules.some((rule) => {
                return (rule.attribute != undefined && rule.attribute != "n/a");
            })) {
            Alert.error("context.selectableAttributes is missing or empty", null, this.session);
        }

        let selectionChangedCache = {};
        for (let rule of rules) {
            try {
                let attribute = rule.attribute;
                if (attribute === undefined
                    || attribute === "n/a"
                    || attributesToEvaluate.indexOf(attribute) >= 0) {

                    if (rule.evaluate(event)) {
                        activatedRules.push(rule);
                    }
                }
            } catch(err) {
                Alert.error("Unable to evaluate rule: " + rule.sourceAsUrl(), err, this.session);
            }
        }

        return activatedRules;
    }

    _updateStudentModelAsync(activatedRules, event) {

        if (activatedRules.length == 0) {
            Alert.debug("No rules fired. Skip student model update.", this.session);
            return Promise.resolve();
        }

        let savePromises = [];
        let rulesFiredMsgs = [];

        if (activatedRules.length > 0) {
            for (let rule of activatedRules) {
                for (let conceptId of rule.concepts()) {
                    savePromises.push(this.studentModelService.processConceptDataPoint(
                        this.student,
                        this.session,
                        conceptId,
                        rule.isCorrect(),
                        event.context.challengeType,
                        event.context.challengeId,
                        rule.attribute,
                        rule.substitutionVariables(),
                        event.time,
                        rule.sourceAsUrl()));

                    rulesFiredMsgs.push("Rule Triggered ->  Correct:{0} | {1} | {2} | rule: {3}".format(
                        rule.isCorrect(), conceptId, rule.attribute, rule.sourceAsUrl()));
                }
            }
        }

        Alert.debug("Fired " + rulesFiredMsgs.length + " rules: \n" + rulesFiredMsgs.join("\n"), this.session);
        savePromises.push(this.studentModelService.updateDashboardAsync(this.student, this.session));

        return Promise.all(savePromises);
    }

    _selectableAttributes(event) {
        let attributes;
        // Minimally, we need to know which attributes were editable in the client
        if (event.context && event.context.selectableAttributes === undefined) {
            attributes = [];
        } else {
            attributes = event.context.selectableAttributes;
        }

        attributes = _.uniq(attributes);

        // This workaround should be removed in the future - rgtaylor 2018-08-24
        // Workaround because of overlapping names in Biologica. Geniventure sends "color" as a
        // selectableAttributes to refer to the "colored" trait.
        let index = attributes.indexOf("color");
        if (index >= 0) {
            attributes[index] = "colored";
        }

        return attributes;
    }
}

module.exports = RulesEvaluator;