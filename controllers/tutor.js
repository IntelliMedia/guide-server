const sessionRepository = require('./sessionRepository');
const students = require('./students');
const await = require('asyncawait/await');

exports.initialize = () => {
    return Promise.resolve(true);
}

exports.processEvent = (logEvent, session) => {

    var event = logEvent.event;

    // Is this the beginning of the session?
    if (isMatch(event, 'SYSTEM', 'STARTED', 'SESSION')) { 
        session.studentId =  event.username;
        session.active = true;
        session.startTime = event.time;       
    }

    return students.createOrFind(session.studentId).then((student) => {
        console.log('Tutor processing student: ' + student.id);
        session.events.unshift(logEvent.event);
        var action = createTutorAction(student, session, event);
        if (action) {
            session.actions.unshift(action.tutorAction);
            session.send('tutorAction', action);
        }           
    });   
}

function createTutorAction(student, session, event) {

    var action = {
        "tutorAction": {
            "type": "dialog",
            "time": Date.now(), 
            "message": {
                "args": {}
            }              
        }
    } 
        
    if (isMatch(event, 'SYSTEM', 'STARTED', 'SESSION')) { 

        student.lastSignIn = new Date(event.time);
        student.totalSessions += 1;           
                  
        switch(Math.floor(Math.random() * 3)) {
            case 0:
                action.tutorAction.message.id = 'ITS.HELLO.1';
                action.tutorAction.message.text = 'Hello {{username}}! I\'m ready to help you learn about genetics.';
                action.tutorAction.message.args.username = event.username;
            break;
            case 1:                
                action.tutorAction.message.id = 'ITS.HELLO.2';
                action.tutorAction.message.text = 'Hi there!';                
            break;
            case 2:
                action.tutorAction.message.id = 'ITS.HELLO.3';
                action.tutorAction.message.text = 'Let\'s get started!';
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
                action.tutorAction.message.id = 'ITS.CHALLENGE.INTRO.1';
                action.tutorAction.message.text = 'I can help you with Case {{case}} Challenge {{challenge}}.';
                action.tutorAction.message.args.case = event.context.case;
                action.tutorAction.message.args.challenge = event.context.challenge;                
            break;
            case 1:
                action.tutorAction.message.id = 'ITS.CHALLENGE.INTRO.2';
                action.tutorAction.message.text = 'Ok! Let\'s get to work on Case {{case}} Challenge {{challenge}}.';
                action.tutorAction.message.args.case = event.context.case;
                action.tutorAction.message.args.challenge = event.context.challenge;                  
            break;
            case 2:
                action.tutorAction.message.id = 'ITS.CHALLENGE.INTRO.3';
                action.tutorAction.message.text = 'I\'m sure you\'re up to the \'challenge\' :-). See what I did there?';                
            break;          
            default:
            action = null;
        }          
    } else if (isMatch(event, 'USER', 'CHANGED', 'ALLELE')) {       
        switch(Math.floor(Math.random() * 6)) {
            case 0:
                action.tutorAction.message.id = 'ITS.ALLELE.FEEDBACK.1';
                action.tutorAction.message.text = 'Hmmm... something doesn\'t look quite right about that allele selection.';
            break;
            case 1:
                action.tutorAction.message.id = 'ITS.ALLELE.FEEDBACK.2';
                action.tutorAction.message.text = 'That allele selection looks correct to me.';
            break;
            case 2:
                action.tutorAction.message.id = 'ITS.ALLELE.FEEDBACK.3';
                action.tutorAction.message.text = 'You are on the right track. Keep going!';
            break;
            case 2:
                action.tutorAction.message.id = 'ITS.ALLELE.FEEDBACK.4';
                action.tutorAction.message.text = 'Perhaps you should review the info on recessive genes?';
            break;            
            default:
            action = null;
        }       
    } else if (isMatch(event, 'USER', 'ADVANCED', 'TRIAL')) {    
        action.tutorAction.type = 'popup';
        action.tutorAction.message.id = 'ITS.TRIAL.FEEDBACK.1';
        action.tutorAction.message.text = '{{username}} advanced trial';
        action.tutorAction.message.args.username = event.username;
    } else if (isMatch(event, 'USER', 'SUBMITTED', 'DRAKE')) {        
        switch(Math.floor(Math.random() * 3)) {
            case 0:
                if (event.context.correct == true) {        
                    action.tutorAction.message.id = 'ITS.SUBMITTED.CORRECT.DRAKE.1';
                    action.tutorAction.message.text = 'Good work! I knew you could do it.';
                }
                else {
                    action.tutorAction.message.id = 'ITS.SUBMITTED.INCORRECT.DRAKE.1';
                    action.tutorAction.message.text = 'Not quite, try again.';
                }
            break;
            case 1:
                if (event.context.correct == true) {                
                    action.tutorAction.message.id = 'ITS.SUBMITTED.CORRECT.DRAKE.2';
                    action.tutorAction.message.text = 'Well done!';
                }
                else {
                    action.tutorAction.message.id = 'ITS.SUBMITTED.INCORRECT.DRAKE.2';
                    action.tutorAction.message.text = 'Keep working at it!';
                }
            break;
            case 2:
                if (event.context.correct == true) {
                    action.tutorAction.message.id = 'ITS.SUBMITTED.CORRECT.DRAKE.3';
                    action.tutorAction.message.text = 'Huzzah!';
                }
                else {
                    action.tutorAction.message.id = 'ITS.SUBMITTED.INCORRECT.DRAKE.3';
                    action.tutorAction.message.text = 'That\'s not quite right.';
                }
            break;          
            default:
            action = null;
        }       
    } else {
        // Do nothing
        action = null;
    }

    var conceptState = student.conceptState('PC 3-B.1-a');
    conceptState.value++;

    student.save((err) => {
        if (err) {
            console.error('Unable to save student info for: ' + currentStudent.id);
            throw err;
        }
    });         
  
  return action;
}

function isMatch(event, actor, action, target) {
    return ((!actor || actor == '*' || actor == event.actor)
        && (!action || action == '*' || action == event.action)
        && (!target || target == '*' || target == event.target));
}