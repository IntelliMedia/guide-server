const students = require('./students');
const Hint = require('../models/Hint');
const TutorAction = require('../models/TutorAction');
const await = require('asyncawait/await');
const guideProtocol = require('../shared/guide-protocol.js');
const EvaluatorRepository = require('./evaluatorRepository');
const EcdRulesEvaluator = require("./ecdRulesEvaluator");

class EventToFunction {
    constructor(actor, action, target, handler) {
        this.actor = actor;
        this.action = action;
        this.target = target;
        this.handler = handler;
    }
};

var eventRoutes = [
    new EventToFunction('SYSTEM', 'STARTED', 'SESSION', handleSystemStartedSessionAsync),
    new EventToFunction('SYSTEM', 'ENDED', 'SESSION', handleSystemEndedSessionAsync),
    new EventToFunction('USER', 'NAVIGATED', 'CHALLENGE', handleUserNavigatedChallengeAsync),
//    new EventToFunction('USER', 'CHANGED', 'ALLELE', handleUserChangedAlleleAsync),
    new EventToFunction('USER', 'SUBMITTED', 'ORGANISM', handleUserSubmittedOrganismAsync),
    new EventToFunction('USER', 'SUBMITTED', 'EGG', handleUserSubmittedOrganismAsync)
];

exports.initialize = () => {
    return Promise.resolve(true);
}

exports.processEventAsync = (event, session) => {

    // Is this the beginning of the session?
    if (event.isMatch("SYSTEM", "STARTED", "SESSION")) {
        session.studentId = event.studentId;
        session.active = true;
        session.startTime = event.time;
    }

    var currentStudent = null;
    return students.createOrFind(session.studentId).then((student) => {
        currentStudent = student;
        session.logEvent(event);

        // Tutor interprets the event
        return handleEventAsync(student, session, event);
    })
    .then((action) => {
        // If the tutor has a response message, record it and send it to the client
        if (action) {
            session.logEvent(action);
            session.emit(GuideProtocol.TutorDialog.Channel, action.context.tutorDialog.toJson());
        }
    })
    .then(() => {
        return saveAsync(session, currentStudent);
    })
}

function handleEventAsync(student, session, event) {

    var eventRouters = eventRoutes.filter((route) => {
        return event.isMatch(route.actor, route.action, route.target);
    });

    if (eventRouters.length > 0) {
        if (eventRouters.length > 1) {
            console.error("Multiple handlers were defined for the same event: " + event.toString())
        }

        console.info("Tutor - handling: " + event.toString() + " user=" + event.studentId);
        return eventRouters[0].handler(student, session, event);
    }

    console.warn("Tutor - unhandled: " + event.toString() + " user=" + event.studentId);
    return new Promise((resolve, reject) => {
        resolve(null);
    });
}

/**
 * Returns promise for saving both session and student
 * @param {*} session 
 * @param {*} student 
 */
function saveAsync(session, student) {
    return session.save().then(() => {
        return student.save();
    });
}

function handleSystemStartedSessionAsync(student, session, event) {
    return new Promise((resolve, reject) => {
        student.lastSignIn = new Date(event.time);
        student.classId = event.context.classId;
        student.groupId = event.context.groupId;
        student.totalSessions += 1;

        session.classId = event.context.classId;
        session.groupId = event.context.groupId;

        var dialogMessage = null;
        var studentId = (event.studentId.toLowerCase().includes("test") ? "there" : event.studentId);
        switch (Math.floor(Math.random() * 3)) {
            case 0:
                dialogMessage = new GuideProtocol.Text(
                    'ITS.HELLO.1',
                    'Hello {{studentId}}! I\'m ready to help you learn about genetics.')
                dialogMessage.args.studentId = studentId;
                break;
            case 1:
                dialogMessage = new GuideProtocol.Text(
                    'ITS.HELLO.2',
                    'Hi there!');
                break;
            case 2:
                dialogMessage = new GuideProtocol.Text(
                    'ITS.HELLO.3',
                    'Let\'s get started!');
        }

        resolve(TutorAction.create(session, "SPOKETO", "USER", "welcome",
            new GuideProtocol.TutorDialog(dialogMessage)));
    });
}

function handleSystemEndedSessionAsync(student, session, event) {
    return new Promise((resolve, reject) => {
        session.active = false;
        session.endTime = event.time;

        resolve(saveAsync(session, student).then(() => {
            return null;
        }));
    });
}

function handleUserNavigatedChallengeAsync(student, session, event) {
    return new Promise((resolve, reject) => {
        var dialogMessage = null;

        switch (Math.floor(Math.random() * 3)) {
            case 0:
                dialogMessage = new GuideProtocol.Text(
                    'ITS.CHALLENGE.INTRO.1',
                    'I can help you with this challenge.');
                // dialogMessage.args.case = event.context.case;
                // dialogMessage.args.challenge = event.context.challenge;
                break;
            case 1:
                dialogMessage = new GuideProtocol.Text(
                    'ITS.CHALLENGE.INTRO.2',
                    'Ok! Let\'s get to work!');
                // dialogMessage.args.case = event.context.case;
                // dialogMessage.args.challenge = event.context.challenge;
                break;
            case 2:
                dialogMessage = new GuideProtocol.Text(
                    'ITS.CHALLENGE.INTRO.3',
                    'I\'m sure you\'re up to the challenge! :-).');
                break;
        }

        resolve(TutorAction.create(session, "SPOKETO", "USER", "navigatedChallenge",
            new GuideProtocol.TutorDialog(dialogMessage)));
    });
}

function handleUserChangedAlleleAsync(student, session, event) {
    return new Promise((resolve, reject) => {
        var dialogMessage = null;

        switch (Math.floor(Math.random() * 6)) {
            case 0:
                dialogMessage = new GuideProtocol.Text(
                    'ITS.ALLELE.FEEDBACK.1',
                    'Hmmm... something doesn\'t look quite right about that allele selection.');
                break;
            case 1:
                dialogMessage = new GuideProtocol.Text(
                    'ITS.ALLELE.FEEDBACK.2',
                    'That allele selection looks correct to me.');
                break;
            case 2:
                dialogMessage = new GuideProtocol.Text(
                    'ITS.ALLELE.FEEDBACK.3',
                    'You are on the right track. Keep going!');
                break;
            case 2:
                dialogMessage = new GuideProtocol.Text(
                    'ITS.ALLELE.FEEDBACK.4',
                    'Perhaps you should review the info on recessive genes?');
                break;
        }

        resolve(TutorAction.create(session, "SPOKETO", "USER", "changedAllele",
            new GuideProtocol.TutorDialog(dialogMessage)));
    });
}

function handleUserSubmittedOrganismAsync(student, session, event) {

    var repo = new EvaluatorRepository();
    return repo.findEvaluatorAsync(session.groupId, event.context.challengeId).then((condition) => {
        return (condition ? condition.evaluateAsync(student, session, event) : null);
    });
}