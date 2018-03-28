const students = require('./students');
const Student = require('../models/Student');
const TutorAction = require('../models/TutorAction');
const Tutor = require('./tutor');
const await = require('asyncawait/await');
const guideProtocol = require('../shared/guide-protocol.js');
const EvaluatorRepository = require('./evaluatorRepository');
const RulesEvaluator = require("./rulesEvaluator");

class EventRouter {
    constructor() {
    }

    processAsync(session, event) {
        // GroupId is set when the this.session starts, but in case the this.session has been started without an
        // open this.session, pick up the groupId from the submit message.
        if (event.context.groupId) {
            session.groupId = event.context.groupId;
        } 

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

            return this.handleEventAsync(student, session, event);
        })
        .then((action) => {
            // If there is a response resulting from the event, send it to the client
            if (action) { 
                session.logEvent(action);
                session.emit(GuideProtocol.TutorDialog.Channel, action.context.tutorDialog.toJson());
                session.debugAlert("Event handled -> ITS action sent to client");
            }
        })
        .then(() => {
            return this.saveAsync(session, currentStudent);
        });
    }

    handleEventAsync(student, session, event) {
        try {
            if (event.isMatch('SYSTEM', 'STARTED', 'SESSION')) {
                return this.handleSystemStartedSessionAsync(student, session, event);

            } else if (event.isMatch('SYSTEM', 'ENDED', 'SESSION')) {
                return this.handleSystemEndedSessionAsync(student, session, event);

            } else if (event.isMatch('USER', 'NAVIGATED', 'CHALLENGE')
                    || event.isMatch('USER', 'CHANGED', 'ALLELE')
                    || event.isMatch('USER', 'SUBMITTED', 'ORGANISM')
                    || event.isMatch('USER', 'SUBMITTED', 'EGG')
                    || event.isMatch('USER', 'SUBMITTED', 'OFFSPRING')
                    || event.isMatch('USER', 'SUBMITTED', 'PARENTS')) {
                let tutor = new Tutor(student, session);
                return tutor.processAsync(event);

            } else {
                session.warningAlert("EventRouter - unhandled: " + event.toString() + " user=" + event.studentId);
                return Promise.resolve(null);
            }
        } catch(err) {
            return  Promise.reject(err);
        }
    }

    saveAsync(session, student) {
        return session.save().then(() => {
            return student.save();
        });
    }

    handleSystemStartedSessionAsync(student, session, event) {
        return new Promise((resolve, reject) => {

            if (!event.context.hasOwnProperty("classId") || !event.context.classId) {
                throw new Error("context.classId is missing or undefined");
            }

            if (!event.context.hasOwnProperty("groupId") || !event.context.groupId) {
                event.context.groupId = "Slice2-June26";
                //throw new Error("student.groupId is missing or undefined");
            }

            student.lastSignIn = new Date(event.time);
            student.classId = event.context.classId;
            student.groupId = event.context.groupId;
            student.learnPortalEndpoint = event.context.itsDBEndpoint;
            student.totalSessions += 1;

            session.classId = event.context.classId;
            session.groupId = event.context.groupId;

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

    handleSystemEndedSessionAsync(student, session, event) {

        return new Promise((resolve, reject) => {
            session.active = false;
            session.endTime = event.time;

            resolve(this.saveAsync(session, student).then(() => {
                return null;
            }));
        });
    }
}

module.exports = EventRouter;