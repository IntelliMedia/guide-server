'use strict';

const Biologicax = require('../shared/biologicax');
const Rule = require('./rule');
const RuleCondition = require('./ruleCondition');
const GoogleSheetRepository = require('../storage/googleSheetRepository');
const arrayx = require("../utilities/arrayx");
const stringx = require("../utilities/stringx");
const _ = require('lodash');
const propPath = require('property-path');

class ChallengeRule extends Rule {
    constructor(challengeId, targetMap) {
        super("n/a");

        this._target = challengeId.toLowerCase().splitAndTrim(",");
        this._targetMap = targetMap;
        this._isCorrect = null;
        this._concepts = targetMap.conceptIds;
        this._selected = null;
    }

    sourceAsUrl() {
        this._checkEvaluated();

        return GoogleSheetRepository.sourceAsUrl(this._targetMap);
    }

    isCorrect() {
        this._checkEvaluated();

        return this._isCorrect;
    }

    concepts() {
        this._checkEvaluated();

        return this._concepts;
    }

    substitutionVariables() {
        this._checkEvaluated();

        return {
            selected: this._selected,
            target: this._target.join(",")
        };
    }

    evaluate(event) {

        let isActivated = false;

        this._selected = this._getProperty(event, "context.challengeId", false);
        if (this._selected != null && (event.action === "SUBMITTED" || event.action === "SELECTED")) {
            isActivated = this._selected && this._selected.toLowerCase().includes(this._target);
            this._isCorrect = this._getProperty(event, "context.correct", true);
        }

        return isActivated;
    }

    _getProperty(obj, path, throwOnMissingProperty) {
        let propertyValue = propPath.get(obj, path);
        if (throwOnMissingProperty && propertyValue == undefined) {
            throw new Error("Unable to find event value at property path: " + path);
        }
        return propertyValue;
    }

    _checkEvaluated() {
        if (this._selected == null || this._target == null) {
            throw new Error("Challenge rule for '{0}' has not been evaluated.".format(this.challenge));
        }
    }
}

module.exports = ChallengeRule;