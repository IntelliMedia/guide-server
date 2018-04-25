const TutorAction = require('../models/TutorAction');
const EvaluatorRepository = require('../storage/evaluatorRepository');
const TutorialPlanner = require('./tutorialPlanner');

class Tutor {
    constructor(student, session) {
        this.student = student;
        this.session = session;
    }

    processAsync(event) {
        try {
            return this.evaluateAsync(event).then(() => this.makeDecisionAsync(event));

        } catch(err) {
            return  Promise.reject(err);
        }
    }    

    evaluateAsync(event) {
        try {
            console.info("evaluateAsync");

            // Use the event's action and target to find an evaluator. E.g., "changed, allele"
            let evaluatorTags = event.action.toLowerCase() + ", " + event.target.toLowerCase();

            let repo = new EvaluatorRepository(this.session);
            return repo.findEvaluatorAsync(this.session.groupId, evaluatorTags).then((evaluator) => {
                return (evaluator ? evaluator.evaluateAsync(this.student, this.session, event) : Promise.resolve(false));
            });

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
            return  Promise.reject(err);
        }
    } 

    handleUserNavigatedChallengeAsync(event) {
        this.checkRequiredProperties(this.student);   

        // Is there tutoring available for this challenge?
        var repo = new EvaluatorRepository(this.session);
        return repo.doesMatchExistAsync(this.session.groupId, event.context.challengeId).then((condition) => {

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

            return TutorAction.create(this.session, "SPOKETO", "USER", "navigatedChallenge",
                new GuideProtocol.TutorDialog(dialogMessage, reason));
        });
    }    

    handleUserChangedAlleleAsync(event) {
        this.checkRequiredProperties();

  

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

            resolve(TutorAction.create(this.session, "SPOKETO", "USER", "changedAllele",
                new GuideProtocol.TutorDialog(dialogMessage)));
        });
    }

    handleUserSubmittedOrganismAsync(event) {
        this.checkRequiredProperties();

        // GroupId is set when the this.session starts, but in case the this.session has been started without an
        // open this.session, pick up the groupId from the submit message.
        if (event.context.groupId) {
            this.session.groupId = event.context.groupId;
        }

        var repo = new EvaluatorRepository(this.session);
        return repo.findEvaluatorAsync(this.session.groupId, event.context.challengeId).then((evaluator) => {
            return (evaluator ? evaluator.evaluateAsync(this.student, this.session, event) : null);
        });
    }

    // Temporary method to convert from old event context to new
    handleUserSubmittedParentsAsync(event) {
        this.checkRequiredProperties();

        event.context.challengeCriteria.characteristicsSibling1 = event.context.challengeCriteria[0].phenotype;
        event.context.challengeCriteria.characteristicsSibling2 = event.context.challengeCriteria[1].phenotype;

        // GroupId is set when the this.session starts, but in case the this.session has been started without an
        // open this.session, pick up the groupId from the submit message.
        if (event.context.groupId) {
            this.session.groupId = event.context.groupId;
        }

        var repo = new EvaluatorRepository(this.session);
        return repo.findEvaluatorAsync(this.session.groupId, event.context.challengeId).then((evaluator) => {
            return (evaluator ? evaluator.evaluateAsync(this.student, this.session, event) : null);
        });
    }

    checkRequiredProperties() {
        if (!this.student.groupId) {
            this.student.groupId = "Slice2-June26";
            //throw new Error("this.student.groupId is missing or undefined");
        }
    }
    
}

module.exports = Tutor;