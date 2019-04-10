'use strict';

const Alert = require("../models/Alert");
const HintRecommender = require('./hintRecommender');
const RemediationRecommender = require('./remediationRecommender');
const stringx = require("../utilities/stringx");

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
        let actionPromises = [];

        let hintRecommender = new HintRecommender();
        actionPromises.push(hintRecommender.evaluateAsync(this.student, this.session, event));

        if (!event.context.hasOwnProperty("remediation") || event.context.remediation != true) {
            let remediationRecommender = new RemediationRecommender();
            actionPromises.push(remediationRecommender.evaluateAsync(this.student, this.session, event));
        }

        return Promise.all(actionPromises).then((results) => {
            let actions = [];

            // Combined actions from each promise into a single list
            results.forEach((result) =>  {
                if (result && result.length > 0) {
                    actions = actions.concat(result);
                }
            });

            let filteredAndSorted = actions
                .filter((action) => action != null)
                .sort((a, b) => b.context.priority - a.context.priority);

            Alert.debug("Possible Tutor Actions: " + filteredAndSorted.length + "\n" + filteredAndSorted.map(a => {
                let actionDescription;
                if (a.action === "HINT") {
                    actionDescription = "{0} | {1} | {2} | {3} | {4} | {5} | {6}".format(
                        a.context.priority,
                        a.action,
                        a.context.conceptId,
                        a.context.attribute,
                        a.context.hintLevel,
                        a.context.isBottomOut,
                        a.context.hintDialog);
                } else if (a.action === "REMEDIATE") {
                    actionDescription = "{0} | {1} | {2} | {3} | {4}".format(
                        a.context.priority,
                        a.action,
                        a.context.conceptId,
                        a.context.attribute,
                        a.context.practiceCriteria);
                } else {
                    actionDescription =  "Unknown action: {0}".format(a.action);
                }

                return actionDescription;
            }).join("\n"), this.session);

            return filteredAndSorted.length > 0 ? filteredAndSorted[0] : null;
        });
    }
}

module.exports = TutorialPlanner;