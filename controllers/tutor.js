const TutorAction = require('../models/TutorAction');
const EvaluatorRepository = require('./evaluatorRepository');

class Tutor {
    constructor() {
    }

    processAsync(student, session, event) {
        try {
            if (event.isMatch('USER', 'NAVIGATED', 'CHALLENGE')) {
                return this.handleUserNavigatedChallengeAsync(student, session, event);   

            } else if (event.isMatch('USER', 'CHANGED', 'ALLELE')) {
                return this.handleUserChangedAlleleAsync(student, session, event);

            } else if (event.isMatch('USER', 'SUBMITTED', 'ORGANISM')) {
                return this.handleUserSubmittedOrganismAsync(student, session, event);

            } else if (event.isMatch('USER', 'SUBMITTED', 'EGG')) {
                return this.handleUserSubmittedOrganismAsync(student, session, event);

            } else if (event.isMatch('USER', 'SUBMITTED', 'OFFSPRING')) {
                return this.handleUserSubmittedOrganismAsync(student, session, event);

            } else if (event.isMatch('USER', 'SUBMITTED', 'PARENTS')) { 
                return this.handleUserSubmittedParentsAsync(student, session, event);                       

            } else {
                session.warningAlert("Tutor - unhandled: " + event.toString() + " user=" + event.studentId);
                return Promise.resolve(null);
            }
        } catch(err) {
            return  Promise.reject(err);
        }
    }

    handleUserNavigatedChallengeAsync(student, session, event) {
        this.checkRequiredProperties(student);   

        // Is there tutoring available for this challenge?
        var repo = new EvaluatorRepository(session);
        return repo.doesMatchExistAsync(session.groupId, event.context.challengeId).then((condition) => {

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

    handleUserChangedAlleleAsync(student, session, event) {
        this.checkRequiredProperties(student);

        // GroupId is set when the session starts, but in case the session has been started without an
        // open session, pick up the groupId from the submit message.
        if (event.context.groupId) {
            session.groupId = event.context.groupId;
        }    

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

    handleUserSubmittedOrganismAsync(student, session, event) {
        this.checkRequiredProperties(student);

        // GroupId is set when the session starts, but in case the session has been started without an
        // open session, pick up the groupId from the submit message.
        if (event.context.groupId) {
            session.groupId = event.context.groupId;
        }

        var repo = new EvaluatorRepository(session);
        return repo.findEvaluatorAsync(session.groupId, event.context.challengeId).then((evaluator) => {
            return (evaluator ? evaluator.evaluateAsync(student, session, event) : null);
        });
    }

    // Temporary method to convert from old event context to new
    handleUserSubmittedParentsAsync(student, session, event) {
        this.checkRequiredProperties(student);

        event.context.challengeCriteria.characteristicsSibling1 = event.context.challengeCriteria[0].phenotype;
        event.context.challengeCriteria.characteristicsSibling2 = event.context.challengeCriteria[1].phenotype;

        // GroupId is set when the session starts, but in case the session has been started without an
        // open session, pick up the groupId from the submit message.
        if (event.context.groupId) {
            session.groupId = event.context.groupId;
        }

        var repo = new EvaluatorRepository(session);
        return repo.findEvaluatorAsync(session.groupId, event.context.challengeId).then((evaluator) => {
            return (evaluator ? evaluator.evaluateAsync(student, session, event) : null);
        });
    }

    checkRequiredProperties(student) {
        if (!student.groupId) {
            student.groupId = "Slice2-June26";
            //throw new Error("student.groupId is missing or undefined");
        }
    }
    
}

module.exports = Tutor;