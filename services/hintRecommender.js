'use strict';

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
        return Group.getCollectionIdsAsync(groupName, tags).then((ids) => {
            if (ids.length == 0) {
                session.warningAlert("Unable to find Google Sheet with tags (" + tags + ") in  group '" + groupName + "'");
            }

            return this.hintRepository.loadCollectionsAsync(ids);
        });
    }    

    // Hint delivery order of preference:
    // On incorrect selection:
    // - Is hint available?
    // - Hint previously delivered for concept/attribute IF BKT score is below threshold
    // - Hint for concept/attribute IF BKT score below threshold (ordered by lowest score)
    evaluateAsync(studentModel, session, event) {
        let groupName = session.groupId;
        return this.initializeAsync(session, groupName, "hints").then(() => {
            let misconceptions = studentModel.getMisconceptionsForEvent(event);
            if (misconceptions.length > 0) {
                misconceptions.forEach((misconception) => {
                    let concept = studentModel.getConceptByAttribute(misconception.conceptId, misconception.attribute);
                    misconception.score = concept.score;
                });
    
                let challengeId = event.context.challengeId;
                let mostRecentHint = studentModel.mostRecentHint(challengeId);
                return this._selectHint(session, 
                    groupName, 
                    event.context.challengeType, 
                    challengeId, 
                    misconceptions, 
                    mostRecentHint);
            }

            return null;
        });
    }

    _selectHint(session, groupId, challengeType, challengeId, misconceptions, mostRecentHint) {
        if (!challengeType) {
            throw new Error("challengeType not defined in context")
        }
        console.info("Observed incorrect concepts:");
        misconceptions = this._sortMisconceptionsByPreviousHintAndThenAscendingScore(misconceptions, mostRecentHint);
        for (let misconception of misconceptions) {
            console.info("   " + misconception.conceptId + " | " + misconception.attribute + " | " + misconception.score + " | " + misconception.source);
        }

        let hintsForChallengeType = this.hintRepository.filter(challengeType);
        for (let misconception of misconceptions) {
            let conceptHints = hintsForChallengeType
                .filter((item) => item.conceptId === misconception.conceptId);

            if (conceptHints && conceptHints.length > 0) { 
                let conceptHint = conceptHints[0];

                let hintLevel = this._incrementHintLevel(mostRecentHint, conceptHint);
                let hintDialog = conceptHint.getHint(hintLevel, misconception.substitutionVariables);
                let isBottomOut = hintLevel == conceptHint.hints.length;

                let action = TutorAction.createHintAction(
                    "MisconceptionDetected",
                    conceptHint.priority,
                    conceptHint.source, 
                    misconception.conceptId,
                    misconception.score,
                    challengeType,
                    challengeId,   
                    misconception.attribute,
                    hintDialog,
                    hintLevel,
                    isBottomOut);

                return action;
            }
        }
        return null;     
    };

    _incrementHintLevel(mostRecentHint, conceptHint) {
        if (mostRecentHint == null) {
            return 0;
        } else {
            return Math.min(mostRecentHint.hintLevel + 1, conceptHint.hints.length - 1);
        }
    }

    _sortMisconceptionsByPreviousHintAndThenAscendingScore(misconceptions, mostRecentHint) {
        return misconceptions.sort(function(a, b) {
            if (mostRecentHint && a.conceptId == b.conceptId) {
                return (a.conceptId == mostRecentHint.conceptId ? 1 : -1);
            } else {
                return a.score -  b.score;
            }
        });
    }
}

module.exports = HintRecommender;