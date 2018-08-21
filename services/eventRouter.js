'use strict';

const students = require('../controllers/students');
const Student = require('../models/Student');
const TutorAction = require('../models/TutorAction');
const Tutor = require('./tutor');
const await = require('asyncawait/await');
const guideProtocol = require('../shared/guide-protocol.js');
const stringx = require("../utilities/stringx");

class EventRouter {
    constructor() {
    }

    processAsync(session, event) {
        // GroupId is set when the this.session starts, but in case the this.session has been started without an
        // open this.session, pick up the groupId from the submit message.
        if (event.context && event.context.groupId) {
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
                // Include the sequence number in the response so that the client
                // can determine whether this action is still relevant to the user.
                action.sequence = event.sequence; 

                console.info("Send: {0} to userId {1} (sequence: {2})".format(
                    action.toString(),
                    action.studentId,
                    action.sequence
                ));
                session.logEvent(action);
                session.emit(GuideProtocol.Event.Channel, action.toJson());
            } else {
                session.debugAlert("No tutoring action recommended.");
            }
        })
        .then(() => {
            return this.saveAsync(session, currentStudent);
        });
    }

    saveAsync(session, student) {
        return session.save().then(() => {
            return student.save();
        });
    }

    handleEventAsync(student, session, event) {
        try {
            if (event.isMatch('SYSTEM', 'STARTED', 'SESSION')) {
                return this.handleSystemStartedSessionAsync(student, session, event);

            } else if (event.isMatch('SYSTEM', 'ENDED', 'SESSION')) {
                return this.handleSystemEndedSessionAsync(student, session, event);

            } else if (event.isMatch('USER', '*', '*')) {
                // Evaluate user actions and potentially take tutoring action
                let tutor = new Tutor(student, session);
                return tutor.processAsync(event);

            } else {
                session.warningAlert("Unhandled message: " + event.toString() + " user=" + event.studentId);
                return Promise.resolve(null);
            }
        } catch(err) {
            return  Promise.reject(err);
        }
    }

    handleSystemStartedSessionAsync(student, session, event) {

        session.infoAlert("Session Started");

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
            student.totalSessions++;

            session.classId = event.context.classId;
            session.groupId = event.context.groupId;

            resolve();
        });
    }

    handleSystemEndedSessionAsync(student, session, event) {

        session.infoAlert("Session Ended");

        return new Promise((resolve, reject) => {
            session.active = false;
            session.endTime = event.time;
            resolve();
        });
    }
}

module.exports = EventRouter;