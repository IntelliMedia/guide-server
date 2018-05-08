'require strict';

const mongoose = require('mongoose');
const guideProtocol = require('../shared/guide-protocol.js');

const tutorActionSchema = new mongoose.Schema({
    action: { type: String, required: true},
    context:  { type: mongoose.Schema.Types.Mixed}
  });

// Create GUIDE protocol event from TutorAction
tutorActionSchema.methods.createEvent = function(userId, sessionId, sequenceNumber) {
    let event = new GuideProtocol.Event(
        userId,
        sessionId,
        sequenceNumber,
        "ITS", this.action, "USER",
        this.context);

    return event;
}

tutorActionSchema.statics.createDialogAction = function(
    reason,
    priority,
    source,
    dialog) {

    let action = TutorAction({
        action: "SPOKETO",   
        context: {
            reason: reason,
            priority: priority,
            source: source, 
            dialog: dialog
        },
    });
}

tutorActionSchema.statics.createHintAction = function(
    reason,
    priority,
    source,  
    conceptId,
    conceptScore,
    challengeType,
    challengeId,
    attribute,
    hintDialog,
    hintLevel,
    isBottomOut) {

    let action = TutorAction({
        action: "HINT",
        context: {
            reason: reason,
            priority: priority,
            source: source, 
            conceptId: conceptId,
            conceptScore: conceptScore,
            challengeType: challengeType,
            challengeId: challengeId,   
            attribute: attribute,
            hintDialog: hintDialog,
            hintLevel: hintLevel,
            isBottomOut: isBottomOut
        },
    });

    return action;
}

tutorActionSchema.statics.createRemediateAction = function(
    reason,
    priority,
    source, 
    conceptId,
    conceptScore,
    challengeType,
    challengeId,   
    attribute,
    isBottomOut) {

    let action = TutorAction({
        action: "REMEDIATE", 
        context: {
            reason: reason,
            priority: priority,
            source: source, 
            conceptId: conceptId,
            conceptScore: conceptScore,
            challengeType: challengeType,
            challengeId: challengeId, 
            attribute: attribute,
            isBottomOut: isBottomOut
        },
    });

    return action;
}

const TutorAction = mongoose.model('TutorAction', tutorActionSchema);
module.exports = TutorAction;
