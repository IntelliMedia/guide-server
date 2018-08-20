'use strict';

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
            this.session.debugAlert("Evaluating " + rules.length + " rules for event: " + event.toString());
        } else {
            this.session.warningAlert("No rules found for event: " + event.toString());          
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
            this.session.errorAlert("context.selectableAttributes is missing or empty");
        }

        let selectionChangedCache = {};
        for (let rule of rules) {
            let attribute = rule.attribute;
            if (attribute === undefined 
                || attribute === "n/a" 
                || attributesToEvaluate.indexOf(attribute) >= 0) {

                if (rule.evaluate(event)) {

                    // Process the rule is the user actively made the correct choice
                    // or allowed the incorrect choice to remain
                    // Don't process rules where the player did nothing and the
                    // current state was correct to avoid concept inflation.
                    if (!rule.isCorrect() || this._hasSelectionChanged(selectionChangedCache, attribute, event))
                    {
                        activatedRules.push(rule);
                    }
                }
            }
        }
        
        return activatedRules;
    }

    _updateStudentModelAsync(activatedRules, event) {
        
        if (activatedRules.length == 0) {
            this.session.debugAlert("No rules fired. Skip student model update.");               
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
                        event.context.challengeId, 
                        rule.attribute, 
                        rule.substitutionVariables(),
                        event.time, 
                        RulesRepository.sourceAsUrl(rule)));

                    rulesFiredMsgs.push("Rule Triggered ->  Correct:{0} | {1} | {2} | rule: {3}".format( 
                        rule.isCorrect(), conceptId, rule.attribute, RulesRepository.sourceAsUrl(rule)));
                }
            }                
        }

        this.session.debugAlert("Fired " + rulesFiredMsgs.length + " rules: \n" + rulesFiredMsgs.join("\n"));
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

        // If the attributes include any color related genes, add "color"
        // to the attribute list to ensure that color rules are evaluated
        // if (attributes.some((attribute) => BiologicaX.doesAttributeAffectCharacterisitic(
        //     BioLogica.Species.Drake,
        //     attribute, 
        //     "color"))) {
        //         attributes.push("color");
        //     }

        return attributes = _.uniq(attributes);
    }

    // Not using right now since changes are usually right with binary choices
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

    _hasSelectionChanged(selectionChangedCache, attribute, event) {
        if (event.context.selectableAttributes === undefined) {
            throw new Error("context.selectableAttributes not defined.");
        }

        // If this has already been calculated, use the cached value
        if (selectionChangedCache.hasOwnProperty(attribute)) {
            return selectionChangedCache[attribute];
        }

        let isChanged = true;
        if (this.attribute === "sex") {
            isChanged = RuleCondition.SexCondition.hasSelectionChanged(event);
        } else {
            isChanged = RuleCondition.AllelesCondition.hasSelectionChanged(event, attribute);
        }

        selectionChangedCache[attribute] = isChanged;

        return isChanged;
    }
}

module.exports = RulesEvaluator;