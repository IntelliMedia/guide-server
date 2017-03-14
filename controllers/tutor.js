const students = require('./students');
const ecdRules = require('../models/EcdRules');
const Hint = require('../models/Hint');
const await = require('asyncawait/await');
const guideProtocol = require('../shared/guide-protocol.js');

exports.initialize = () => {
    return Promise.resolve(true);
}

exports.processEvent = (event, session) => {

    // Is this the beginning of the session?
    if (isMatch(event, 'SYSTEM', 'STARTED', 'SESSION')) { 
        session.studentId =  event.username;
        session.active = true;
        session.startTime = event.time;       
    }

    return students.createOrFind(session.studentId).then((student) => {
        console.log('Tutor processing student: ' + student.id);
        session.events.unshift(event);
        
        var tutorDialog = createTutorAction(student, session, event);
        if (tutorDialog) {
            session.actions.unshift(tutorDialog);
            session.emit(GuideProtocol.TutorDialog.Channel, tutorDialog.toJson());
        }           
    });
}

function createTutorAction(student, session, event) {
        
    var dialogMessage = null;

    if (isMatch(event, 'SYSTEM', 'STARTED', 'SESSION')) { 

        student.lastSignIn = new Date(event.time);
        student.totalSessions += 1;           
        session.groupId = event.context.group;
                  
        switch(Math.floor(Math.random() * 3)) {
            case 0:
                dialogMessage = new GuideProtocol.Text(
                    'ITS.HELLO.1',
                    'Hello {{username}}! I\'m ready to help you learn about genetics.')
                dialogMessage.args.username = event.username;
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
            break;          
            default:
                action = null;
        }         
    } else if (isMatch(event, 'SYSTEM', 'ENDED', 'SESSION')) {
        session.active = false;
        session.endTime = event.time;
        action = null;
    } else if (isMatch(event, 'USER', 'NAVIGATED', 'CHALLENGE')) {             
        switch(Math.floor(Math.random() * 3)) {
            case 0:
                dialogMessage = new GuideProtocol.Text(            
                    'ITS.CHALLENGE.INTRO.1',
                    'I can help you with Case {{case}} Challenge {{challenge}}.');
                dialogMessage.args.case = event.context.case;
                dialogMessage.args.challenge = event.context.challenge;              
            break;
            case 1:
                dialogMessage = new GuideProtocol.Text(            
                    'ITS.CHALLENGE.INTRO.2',
                    'Ok! Let\'s get to work on Case {{case}} Challenge {{challenge}}.');
                dialogMessage.args.case = event.context.case;
                dialogMessage.args.challenge = event.context.challenge;                   
            break;
            case 2:
                dialogMessage = new GuideProtocol.Text(            
                    'ITS.CHALLENGE.INTRO.3',
                    'I\'m sure you\'re up to the \'challenge\' :-). See what I did there?');                
            break;          
            default:
            action = null;
        }          
    } else if (isMatch(event, 'USER', 'CHANGED', 'ALLELE')) {       
        switch(Math.floor(Math.random() * 6)) {
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
            case 2:
                dialogMessage = new GuideProtocol.Text(            
                    'ITS.ALLELE.FEEDBACK.4',
                    'Perhaps you should review the info on recessive genes?');
            break;            
            default:
            action = null;
        }       
    } else if (isMatch(event, 'USER', 'ADVANCED', 'TRIAL')) {
        // TODO    
    } else if (isMatch(event, 'USER', 'SUBMITTED', 'ORGANISM')) {    

        var conceptIdToGenes = ecdRules.updateStudentModel(
            student, 
            session.groupId,
            event.context.guideId,
            event.context.editableGenes, 
            event.context.species,            
            event.context.initialAlleles, 
            event.context.selectedAlleles,
            event.context.targetAlleles,
            event.context.targetSex);

        if (event.context.correct) {
            student.resetAllHintLevels();
        } else {
            var concepts = student.conceptStates.toObject();
            if (concepts == null || concepts.length == 0) {
                console.error("Student (" + student.id + ") doesn't have any concepts defined");
            } else {
                var keysSorted = Object.keys(concepts).sort(function(a,b){return concepts[a].value-concepts[b].value});
                console.log('sorted concepts: ' + keysSorted);

                var lowestConceptId = concepts[keysSorted[0]].id;
                var conceptHintLevel = concepts[keysSorted[0]].hintLevel;

                var hint = Hint.getHint(lowestConceptId, conceptHintLevel);
                if (hint != null) {
                    student.conceptState(lowestConceptId).hintLevel = hint.level;

                    var trait = "unknown";
                    if (conceptIdToGenes.hasOwnProperty(lowestConceptId)) {
                        trait = conceptIdToGenes[lowestConceptId].trait;
                    }

                    dialogMessage = new GuideProtocol.Text(            
                        'ITS.CONCEPT.FEEDBACK',
                        hint.message);   
                    dialogMessage.args.trait = trait; 
                } else {
                    console.warn("No hint available for " + lowestConceptId + " level=" + conceptHintLevel);
                }
            }         
        }

    } else if (isMatch(event, 'USER', 'SUBMITTED', 'DRAKE')) {        
        switch(Math.floor(Math.random() * 3)) {
            case 0:
                if (event.context.correct == true) {        
                    dialogMessage = new GuideProtocol.Text(                    
                        'ITS.SUBMITTED.CORRECT.DRAKE.1',
                        'Good work! I knew you could do it.');
                }
                else {
                    dialogMessage = new GuideProtocol.Text(                    
                        'ITS.SUBMITTED.INCORRECT.DRAKE.1',
                        'Not quite, try again.');
                }
            break;
            case 1:
                if (event.context.correct == true) {      
                    dialogMessage = new GuideProtocol.Text(          
                        'ITS.SUBMITTED.CORRECT.DRAKE.2',
                        'Well done!');
                }
                else {
                    dialogMessage = new GuideProtocol.Text(
                        'ITS.SUBMITTED.INCORRECT.DRAKE.2',
                        'Keep working at it!');
                }
            break;
            case 2:
                if (event.context.correct == true) {
                    dialogMessage = new GuideProtocol.Text(                    
                        'ITS.SUBMITTED.CORRECT.DRAKE.3',
                        'Huzzah!');
                }
                else {
                    dialogMessage = new GuideProtocol.Text(                    
                        'ITS.SUBMITTED.INCORRECT.DRAKE.3',
                        'That\'s not quite right.');
                }
            break;          
            default:
            action = null;
        }       
    } else {
        // Do nothing
        action = null;
    }

    session.save((err) => {
        if (err) {
            console.error('Unable to save session info for: ' + currentStudent.id);
            throw err;
        }

        student.save((err) => {
            if (err) {
                console.error('Unable to save student info for: ' + currentStudent.id);
                throw err;
            }
        });         
    });         
  
  if (dialogMessage) {
      return new GuideProtocol.TutorDialog(dialogMessage);
  } else {
      // Do nothing
      return null;
  }
}

function isMatch(event, actor, action, target) {
    return ((!actor || actor == '*' || actor == event.actor)
        && (!action || action == '*' || action == event.action)
        && (!target || target == '*' || target == event.target));
}