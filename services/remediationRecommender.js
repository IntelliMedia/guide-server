'use strict';

const ConceptHintsRepository = require('../storage/conceptHintsRepository');
const Group = require('../models/Group');
const TutorAction = require('../models/TutorAction');

/**
 * This evaluates the student model and decides whether or not a hint
 * should be given to the student.
 */
class RemediationRecommender {
    constructor() {
        this.remediationRepository = new ConceptHintsRepository(global.cacheDirectory);
    }

    initializeAsync(session, groupName, tags) {
        return Group.getCollectionIdsAsync(groupName, tags).then((ids) => {
            if (ids.length == 0) {
                session.warningAlert("Unable to find Google Sheet with tags (" + tags + ") in  group '" + groupName + "'");
            }

            return this.remediationRepository.loadCollectionsAsync(ids);
        });
    }    

    // Based on current event and student model, determine if remediation is necessary 
    evaluateAsync(studentModel, session, event) {
        let groupName = session.groupId;
        return this.initializeAsync(session, groupName, "remediation").then(() => {
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

        let hintsForChallengeType = this.remediationRepository.filter(challengeType);
        for (let misconception of misconceptions) {
            let conceptHints = hintsForChallengeType
                .filter((item) => item.conceptId === misconception.conceptId);

            if (conceptHints && conceptHints.length > 0) { 
                let conceptHint = conceptHints[0];
                return this._createRemediateAction(
                    session,
                    conceptHint.priority,
                    "Let's practice this some more",
                    //conceptHint.getHint(hintLevel, misconception.substitutionVariables),
                    misconception.attribute,
                    challengeId,
                    "Rule: " + misconception.source + "\nHint: " + conceptHint.source
                );
            }
        }
        return null;     
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

    _createRemediateAction(session, priority, dialogText, attribute, challengeId, source) {        
        let dialogMessage = new GuideProtocol.Text(
            'ITS.CONCEPT.FEEDBACK',
            dialogText);
        dialogMessage.args.attribute = attribute;

        let reason = {
            why: "MisconceptionDetected",
            source: source,
            attribute: attribute
        };
        let action = TutorAction.create(session, "ACTIVATED", "REMEDIATATION", "misconception",
                    new GuideProtocol.TutorDialog(dialogMessage, reason));
        action.context.priority = priority;
        action.context.challengeId = challengeId;
        action.context.source = source;    

        return action;
    }
}

module.exports = RemediationRecommender;