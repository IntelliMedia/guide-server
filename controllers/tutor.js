const students = require('./students');
const Student = require('../models/Student');
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
 //   new EventToFunction('USER', 'CHANGED', 'ALLELE', handleUserChangedAlleleAsync),
    new EventToFunction('USER', 'SUBMITTED', 'ORGANISM', handleUserSubmittedOrganismAsync),
    new EventToFunction('USER', 'SUBMITTED', 'EGG', handleUserSubmittedOrganismAsync),
    new EventToFunction('USER', 'SUBMITTED', 'OFFSPRING', handleUserSubmittedOrganismAsync)
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
    return Student.findOrCreate(session.studentId).then((student) => {

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
    });
}

function handleEventAsync(student, session, event) {
    try {
        var eventRouters = eventRoutes.filter((route) => {
            return event.isMatch(route.actor, route.action, route.target);
        });

        if (eventRouters.length > 0) {
            if (eventRouters.length > 1) {
                console.error("Multiple handlers were defined for the same event: " + event.toString())
            }

            session.debugAlert("Tutor - handling: " + event.toString() + " user=" + event.studentId);
            return eventRouters[0].handler(student, session, event);
        }

        session.warningAlert("Tutor - unhandled: " + event.toString() + " user=" + event.studentId);
        return new Promise((resolve, reject) => {
            resolve(null);
        });
    } catch(err) {
        return new Promise((resolve, reject) => {
            reject(err);
        });
    }
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

        if (!event.context.hasOwnProperty("classId") || !event.context.classId) {
            throw new Error("context.classId is missing or undefined");
        }

        if (!event.context.hasOwnProperty("groupId") || !event.context.groupId) {
            throw new Error("context.groupId is missing or undefined");
        }

        student.lastSignIn = new Date(event.time);
        student.classId = event.context.classId;
        student.groupId = event.context.groupId;
        student.learnPortalEndpoint = event.context.itsDBEndpoint;
        student.totalSessions += 1;

        session.classId = event.context.classId;
        session.groupId = event.context.groupId;

        checkRequiredProperties(student);

        var dialogMessage = null;
        var studentId = (event.studentId.toLowerCase().includes("test") ? "there" : event.studentId);
        switch (Math.floor(Math.random() * 3)) {
            case 0:
                dialogMessage = new GuideProtocol.Text(
                    'ITS.HELLO.1',
                    'Hello! I\'m ready to help you learn about genetics.')
                    // TODO user student's first name (studentId is a number)
                    //'Hello {{studentId}}! I\'m ready to help you learn about genetics.')
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

        var reason = {
            why: "SessionStarted"
        };

        resolve(TutorAction.create(session, "SPOKETO", "USER", "welcome",
            new GuideProtocol.TutorDialog(dialogMessage, reason)));
    });
}

function handleSystemEndedSessionAsync(student, session, event) {
    checkRequiredProperties(student);

    return new Promise((resolve, reject) => {
        session.active = false;
        session.endTime = event.time;

        resolve(saveAsync(session, student).then(() => {
            return null;
        }));
    });
}

function handleUserNavigatedChallengeAsync(student, session, event) {
    checkRequiredProperties(student);

    // Is there tutoring available for this challenge?
    var repo = new EvaluatorRepository(session);
    return repo.doesEvaluatorExistAsync(session.groupId, event.context.challengeId).then((condition) => {

        if (!condition) {
            return null;
        };

        // If there is tutoring available, indicate it to the user with a feedback message.
        var dialogMessage = null;

        switch (Math.floor(Math.random() * 5)) {
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
            case 3:
                dialogMessage = new GuideProtocol.Text(
                    'ITS.CHALLENGE.INTRO.4',
                    'We\'re going to work on this together!');
                break;
            case 4:
                dialogMessage = new GuideProtocol.Text(
                    'ITS.CHALLENGE.INTRO.5',
                    'You and I are a team and we\'re going to work on this together!');
                break;
        }

        var reason = {
            why: "ChallengeWithTutoringAvailableStarted",
            challengeId: event.context.challengeId
        };

        return TutorAction.create(session, "SPOKETO", "USER", "navigatedChallenge",
            new GuideProtocol.TutorDialog(dialogMessage, reason));
    });
}

function handleUserChangedAlleleAsync(student, session, event) {
    checkRequiredProperties(student);

    return new Promise((resolve, reject) => {
        var dialogMessage = null;

        switch (Math.floor(Math.random() * 4)) {
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
            case 3:
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
    checkRequiredProperties(student);

    var repo = new EvaluatorRepository(session);
    return repo.findEvaluatorAsync(session.groupId, event.context.challengeId).then((evaluator) => {
        return (evaluator ? evaluator.evaluateAsync(student, session, event) : null);
    });
}

function checkRequiredProperties(student) {
    if (!student.groupId) {
        throw new Error("student.groupId is missing or undefined");
    }
}