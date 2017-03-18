const students = require('./students');
const Hint = require('../models/Hint');
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
    new EventToFunction('USER', 'SUBMITTED', 'ORGANISM', handleUserSubmittedOrganismAsync)
];

exports.initialize = () => {
    return Promise.resolve(true);
}

exports.processEventAsync = (event, session) => {

    // Is this the beginning of the session?
    if (event.isMatch("SYSTEM", "STARTED", "SESSION")) {
        session.studentId = event.username;
        session.active = true;
        session.startTime = event.time;
    }

    return students.createOrFind(session.studentId).then((student) => {
        session.events.unshift(event);

        // Tutor interprets the event
        return handleEventAsync(student, session, event);
    })
        .then((response) => {
            // If the tutor has a response message, record it and send it to the client
            if (response) {
                session.actions.unshift(response);
                session.emit(GuideProtocol.TutorDialog.Channel, response.toJson());
            }
        });
}

function handleEventAsync(student, session, event) {

    var eventRouters = eventRoutes.filter((route) => {
        return event.isMatch(route.actor, route.action, route.target);
    });

    if (eventRouters.length > 0) {
        if (eventRouters.length > 1) {
            console.error("Multiple handlers were defined for the same event: " + event.toString())
        }

        console.info("Tutor - handling: " + event.toString() + " user=" + event.username);
        return eventRouters[0].handler(student, session, event);
    }

    console.warn("Tutor - unhandled: " + event.toString() + " user=" + event.username);
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
        student.totalSessions += 1;
        session.groupId = event.context.groupId;

        var dialogMessage = null;
        var username = (event.username.toLowerCase().includes("test") ? "there" : event.username);
        switch (Math.floor(Math.random() * 3)) {
            case 0:
                dialogMessage = new GuideProtocol.Text(
                    'ITS.HELLO.1',
                    'Hello {{username}}! I\'m ready to help you learn about genetics.')
                dialogMessage.args.username = username;
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

        resolve(saveAsync(session, student).then(() => {
            return new GuideProtocol.TutorDialog(dialogMessage);
        }));
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
        session.groupId = event.context.groupId;

        // switch (Math.floor(Math.random() * 3)) {
        //     case 0:
        //         dialogMessage = new GuideProtocol.Text(
        //             'ITS.CHALLENGE.INTRO.1',
        //             'I can help you with Case {{case}} Challenge {{challenge}}.');
        //         dialogMessage.args.case = event.context.case;
        //         dialogMessage.args.challenge = event.context.challenge;
        //         break;
        //     case 1:
        //         dialogMessage = new GuideProtocol.Text(
        //             'ITS.CHALLENGE.INTRO.2',
        //             'Ok! Let\'s get to work on Case {{case}} Challenge {{challenge}}.');
        //         dialogMessage.args.case = event.context.case;
        //         dialogMessage.args.challenge = event.context.challenge;
        //         break;
        //     case 2:
        //         dialogMessage = new GuideProtocol.Text(
        //             'ITS.CHALLENGE.INTRO.3',
        //             'I\'m sure you\'re up to the \'challenge\' :-). See what I did there?');
        //         break;
        // }

        resolve(saveAsync(session, student).then(() => {
            return (dialogMessage ? new GuideProtocol.TutorDialog(dialogMessage) : null);
        }));
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

        resolve(dialogMessage ? new GuideProtocol.TutorDialog(dialogMessage) : null);
    });
}

function handleUserSubmittedOrganismAsync(student, session, event) {

    var repo = new EvaluatorRepository();
    return repo.findEvaluatorAsync(session.groupId, event.context.challengeId).then((evaluator) => {
        return (evaluator ? evaluator.evaluateAsync(student, session, event) : null);
    })
    .then((action) => {
        return saveAsync(session, student).then(() => {
            return (action ? action : null);
        });
    });
}