'use strict';

const Alert = require("../models/Alert");
const RemediationRepository = require('../storage/remediationRepository');
const Group = require('../models/Group');
const TutorAction = require('../models/TutorAction');

/**
 * This evaluates the student model and decides whether or not a hint
 * should be given to the student.
 */
class RemediationRecommender {
    constructor() {
        this.remediationRepository = new RemediationRepository(global.cacheDirectory);
    }

    initializeAsync(session, groupName, tags) {
        return Group.findOne({ "name": groupName }).then((group) => {
            if (!group) {
                throw new Error("Unable to find group with name: " + groupName);
            }

            let ids = group.getCollectionIds(tags);

            if (ids.length == 0) {
                Alert.warning("Unable to find Remediation sheet for [" + tags + "] defined in '" + groupName + "' group", session);
            }

            return this.remediationRepository.loadCollectionsAsync(ids, group.cacheDisabled);
        });
    }

    // Based on current event and student model, determine if remediation is necessary
    evaluateAsync(student, session, event) {
        let studentModel = student.studentModel;
        let groupName = session.groupId;
        return this.initializeAsync(session, groupName, "remediation").then(() => {
            let misconceptions = studentModel.getMisconceptionsForEvent(event);
            if (misconceptions.length > 0) {
                misconceptions.forEach((misconception) => {
                    let conceptState = studentModel.getBktConceptState(misconception.conceptId);
                    misconception.conceptState = conceptState;
                });

                let challengeId = event.context.challengeId;
                return this._selectRemediations(
                    student,
                    session,
                    groupName,
                    event.context.challengeType,
                    challengeId,
                    misconceptions);
            }

            return null;
        });
    }

    _selectRemediations(student, session, groupId, challengeType, challengeId, misconceptions) {
        if (!challengeType) {
            throw new Error("challengeType not defined in context")
        }
        console.log("Observed incorrect concepts:");
        let mostRecentRemediation = student.studentModel.mostRecentAction("REMEDIATE", challengeId);
        misconceptions = this._sortMisconceptionsByPreviousHintAndThenAscendingScore(misconceptions, mostRecentRemediation);
        for (let misconception of misconceptions) {
            console.log("   " + misconception.conceptId + " | " + misconception.attribute + " | " + misconception.conceptState.probabilityLearned + " | " + misconception.source);
        }

        let remediateActions = [];

        let remediationsForChallengeType = this.remediationRepository.filter(challengeType);
        for (let misconception of misconceptions) {
            let remediations = remediationsForChallengeType.filter((item) =>
                item.conceptId === misconception.conceptId
                && misconception.conceptState.totalAttempts >= item.minimumAttempts
                && misconception.conceptState.probabilityLearned <= item.probabilityLearnedThreshold);

            for (let remediation of remediations) {
                let priorityAdjustment = (mostRecentRemediation && mostRecentRemediation.context.conceptId === remediation.conceptId ? 10 : 0);
                let mostRecentHint = student.studentModel.mostRecentAction("HINT", challengeId, misconception.attribute);
                priorityAdjustment += (mostRecentHint
                        && mostRecentHint.context.conceptId === remediation.conceptId
                        && mostRecentHint.context.attribute === misconception.attribute
                        && mostRecentHint.context.isBottomOut === true ? mostRecentHint.context.priority * 2 : 0);

                // TODO: Determine if this is bottom out remediation
                let isBottomOut = false;

                let action = TutorAction.createRemediateAction(
                    "MisconceptionDetected",
                    remediation.priority + priorityAdjustment,
                    RemediationRepository.sourceAsUrl(remediation),
                    misconception.conceptId,
                    misconception.conceptState.probabilityLearned,
                    challengeType,
                    challengeId,
                    remediation.practiceCriteria,
                    misconception.attribute,
                    isBottomOut);

                remediateActions.push(action);
            }
        }
        return remediateActions;
    };

    _sortMisconceptionsByPreviousHintAndThenAscendingScore(misconceptions, mostRecentRemediation) {
        return misconceptions.sort(function(a, b) {
            if (mostRecentRemediation && a.conceptId == b.conceptId) {
                return (a.conceptId == mostRecentRemediation.context.conceptId ? 1 : -1);
            } else {
                return a.probabilityLearned -  b.probabilityLearned;
            }
        });
    }
}

module.exports = RemediationRecommender;