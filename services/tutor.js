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

    processAsync(event) {
        try {
            return this.evaluateAsync(event)
                .then(() => this.makeDecisionAsync(event))
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

    evaluateAsync(event) {
        try {
            console.info("evaluateAsync");

            // Use the event's action and target to find an evaluator. E.g., "changed, allele"
            let evaluatorTags = event.action.toLowerCase() + ", " + event.target.toLowerCase();

            let rulesEvaluator = new RulesEvaluator();
            return rulesEvaluator.initializeAsync(this.session, this.session.groupId, evaluatorTags)
                .then(() => rulesEvaluator.evaluateAsync(this.student, this.session, event));

        } catch(err) {
            return  Promise.reject(err);
        }
    }   
    
    makeDecisionAsync(event) {
        try {
            console.info("makeDecisionAsync");
            let tutorialPlanner = new TutorialPlanner(this.student, this.session);
            return tutorialPlanner.evaluateAsync(event);
        } catch(err) {
            return Promise.reject(err);
        }
    }  
}

module.exports = Tutor;