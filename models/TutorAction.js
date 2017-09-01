'require strict';

const guideProtocol = require('../shared/guide-protocol.js');

function createEvent(currentUser, currentSessionId, sequenceNumber, actor, action, target, context) {
    var event = new GuideProtocol.Event(
        currentUser,
        currentSessionId,
        sequenceNumber,
        actor,
        action,
        target,
        context);

    return event;
}

module.exports.create = function (session, action, target, reason, tutorDialog) {

    var context = {};

    if (reason) {
        context.reason = reason;
    }

    if (tutorDialog) {
        context.tutorDialog = tutorDialog;
    }

    return createEvent(
        session.studentId,
        session.id,
        session.sequenceNumber++,
        "ITS", action, target, context);
}
