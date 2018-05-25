'use strict';

const HintRecommender = require('./hintRecommender');
const RemediationRecommender = require('./remediationRecommender');

/**
 * This class decides whether or not to issue a hint based on the student model.
 */
class TutorialPlanner {
    constructor(student, session) {
        this.student = student;
        this.session = session;
    }

    // Returns action or null if the the tutor shouldn't take an action
    evaluateAsync(event) {

        // Future: add other possible tutorial actions (other than hinting) like 
        // outer loop problem selection recommendation.
        if (!event.context.correct) {
            let actionPromises = [];

            let hintRecommender = new HintRecommender();
            actionPromises.push(hintRecommender.evaluateAsync(this.student, this.session, event));

            if (event.context.hasOwnProperty("remediation") && event.context.remediation != true) {
                let remediationRecommender = new RemediationRecommender();
                actionPromises.push(remediationRecommender.evaluateAsync(this.student, this.session, event));
            }

            return Promise.all(actionPromises).then((results) => {
                let filteredAndSorted = results
                    .filter((action) => action != null)
                    .sort((a, b) => b.context.priority - a.context.priority);
                return filteredAndSorted.length > 0 ? filteredAndSorted[0] : null;
            });
        } else {
            this.session.debugAlert("No need to send hint, organism is correct for user: " + this.student.id);
            return null;
        }  
    }
}

module.exports = TutorialPlanner;