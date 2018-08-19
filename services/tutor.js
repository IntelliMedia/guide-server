'use strict';

const TutorAction = require('../models/TutorAction');
const RulesEvaluator = require('./rulesEvaluator');
const TutorialPlanner = require('./tutorialPlanner');
const stacktracex = require('../utilities/stacktracex');

class Tutor {
    constructor(student, session) {
        this.student = student;
        this.session = session;
    }

    // Process the event from the client
    processAsync(event) {
        try {
            return this._evaluateAsync(event)
                .then(() => this._makeDecisionAsync(event))
                .then((tutorAction) => {
                    if (tutorAction != null) {
                        let action = this.student.studentModel.addAction(tutorAction);
                        return action.createEvent(
                                this.session.studentId,
                                this.session.id);
                    } else {
                        return null;
                    }
                });

        } catch(err) {
            return  Promise.reject(err);
        }
    }    

    // Evaluate user action and update student model
    _evaluateAsync(event) {
        try {
            let evaluator = new RulesEvaluator(this.student, this.session);
            return evaluator.evaluateAsync(event);

        } catch(err) {
            return Promise.reject(err);
        }
    }   
    
    // Use the student model to decide on which tutor action to take
    _makeDecisionAsync(event) {
        try {
            let tutorialPlanner = new TutorialPlanner(this.student, this.session);
            return tutorialPlanner.evaluateAsync(event);
        } catch(err) {
            return Promise.reject(err);
        }
    }  
}

module.exports = Tutor;