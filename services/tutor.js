'use strict';

const TutorAction = require('../models/TutorAction');
const Evaluator = require('./euvaluator');
const OrganismEvaluator = require('./organismEvaluator');
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

            let evaluator = null;

            if (event.isMatch('USER', 'CHANGED', 'ALLELE')) {
                evaluator = new Evaluator();
            } else if (event.isMatch('USER', 'SELECTED', 'GAMETE')) {
                evaluator = new Evaluator();
            } else if (event.isMatch('USER', 'SUBMITTED', 'ORGANISM')) {
                evaluator = new OrganismEvaluator();
            } else if (event.isMatch('USER', 'SUBMITTED', 'EGG')) {
                evaluator = new OrganismEvaluator();
            } else if (event.isMatch('USER', 'BRED', 'CLUTCH')) {
                evaluator = new Evaluator();
            } else if (event.isMatch('USER', 'CHANGED', 'PARENT')) {
                evaluator = new Evaluator();
            } else if (event.isMatch('USER', 'SELECTED', 'OFFSPRING')) {
                evaluator = new Evaluator();
            } else if (event.isMatch('USER', 'SUBMITTED', 'PARENTS')) {
                evaluator = new Evaluator();
            } else {
                throw new Error("Unable to find evaluator for event: " + event.toString());
            }

            // Use the event's action and target to find an evaluator. E.g., "changed, allele"
            let evaluatorTags = event.action.toLowerCase() + ", " + event.target.toLowerCase();
            return evaluator.initializeAsync(this.session, this.session.groupId, evaluatorTags)
                .then(() => evaluator.evaluateAsync(this.student, this.session, event));

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