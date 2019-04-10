'use strict';

const Alert = require("../models/Alert");
const ConceptHintsRepository = require('../storage/conceptHintsRepository');
const Group = require('../models/Group');
const TutorAction = require('../models/TutorAction');

/**
 * This evaluates the student model and decides whether or not a hint
 * should be given to the student.
 */
class HintRecommender {
    constructor() {
        this.hintRepository = new ConceptHintsRepository(global.cacheDirectory);
    }

    initializeAsync(session, groupName, tags) {
        return Group.findOne({ "name": groupName }).then((group) => {
            if (!group) {
                throw new Error("Unable to find group with name: " + groupName);
            }

            let ids = group.getCollectionIds(tags);

            if (ids.length == 0) {
                Alert.warning("Unable to find Hint sheet for [" + tags + "] defined in '" + groupName + "' group", session);
            }

            return this.hintRepository.loadCollectionsAsync(ids, group.cacheDisabled);
        });
    }

    // Hint delivery order of preference:
    // On incorrect selection:
    // - Is hint available?
    // - Hint previously delivered for concept/attribute IF BKT probabilityLearned is below threshold
    // - Hint for concept/attribute IF BKT probabilityLearned below threshold (ordered by lowest probabilityLearned)
    evaluateAsync(student, session, event) {
        let studentModel = student.studentModel;
        let groupName = session.groupId;
        return this.initializeAsync(session, groupName, "hints").then(() => {
            let misconceptions = studentModel.getMisconceptionsForEvent(event);
            if (misconceptions.length > 0) {
                misconceptions.forEach((misconception) => {
                    let conceptState = studentModel.getBktConceptState(misconception.conceptId);
                    misconception.conceptState = conceptState;
                });

                let challengeId = event.context.challengeId;
                return this._selectHints(
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

    _selectHints(student, session, groupId, challengeType, challengeId, misconceptions) {
        if (!challengeType) {
            throw new Error("challengeType not defined in context")
        }
        console.log("Observed incorrect concepts:");
        let mostRecentHint = student.studentModel.mostRecentAction("HINT", challengeId);
        misconceptions = this._sortMisconceptionsByPreviousHintAndThenAscendingScore(misconceptions, mostRecentHint);
        for (let misconception of misconceptions) {
            console.log("   " + misconception.conceptId + " | " + misconception.attribute + " | " + misconception.conceptState.probabilityLearned + " | " + misconception.source);
        }

        let hintActions = [];

        let hintsForChallengeType = this.hintRepository.filter(challengeType);
        for (let misconception of misconceptions) {
            let conceptHints = hintsForChallengeType.filter((item) =>
                misconception.conceptId === item.conceptId
                && misconception.conceptState.totalAttempts >= item.minimumAttempts
                && misconception.conceptState.probabilityLearned <= item.probabilityLearnedThreshold);

            if (conceptHints.length == 0) {
                if (!(hintsForChallengeType.some((item) => item.conceptId === misconception.conceptId))) {
                    Alert.warning("No hint defined for " + challengeType + " challenge for concept: " + misconception.conceptId, session);
                }
            }

            for (let conceptHint of conceptHints) {
                mostRecentHint = student.studentModel.mostRecentAction("HINT", challengeId, misconception.attribute);
                let hintIndex = this._incrementHintIndex(mostRecentHint, conceptHint);
                let hintDialog = conceptHint.getHint(hintIndex, misconception.substitutionVariables);

                let bottomOutHintAlreadyDelivered = false;
                let priorityAdjustment = 0;
                if (mostRecentHint
                    && mostRecentHint.context.attribute === misconception.attribute
                    && mostRecentHint.context.conceptId === conceptHint.conceptId) {
                        priorityAdjustment = 10;
                        bottomOutHintAlreadyDelivered = mostRecentHint.context.hintLevel == conceptHint.hints.length;
                }

                // HintLevel is 1-based counting to align with levels defined in Hint sheet and
                // to make it more comfortable for non-CompSci authors to understand.
                let hintLevel = hintIndex + 1;
                let isBottomOut = hintLevel == conceptHint.hints.length;

                let currentPriority = conceptHint.priority;
                currentPriority += priorityAdjustment;

                let action = TutorAction.createHintAction(
                    "MisconceptionDetected",
                    currentPriority,
                    ConceptHintsRepository.sourceAsUrl(conceptHint),
                    misconception.conceptId,
                    misconception.conceptState.probabilityLearned,
                    challengeType,
                    challengeId,
                    misconception.attribute,
                    hintDialog,
                    hintLevel,
                    isBottomOut);

                hintActions.push(action);
            }
        }
        return hintActions;
    };

    _incrementHintIndex(mostRecentHint, conceptHint) {
        if (mostRecentHint == null) {
            return 0;
        } else {
            return Math.min(mostRecentHint.context.hintLevel, conceptHint.hints.length - 1);
        }
    }

    _sortMisconceptionsByPreviousHintAndThenAscendingScore(misconceptions, mostRecentHint) {
        return misconceptions.sort(function(a, b) {
            if (mostRecentHint && a.conceptId == b.conceptId) {
                return (a.conceptId == mostRecentHint.context.conceptId ? 1 : -1);
            } else {
                return a.probabilityLearned -  b.probabilityLearned;
            }
        });
    }
}

module.exports = HintRecommender;