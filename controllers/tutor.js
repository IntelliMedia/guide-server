const sessionRepository = require('./sessionRepository');

exports.initialize = () => {
    return Promise.resolve(true);
}

exports.processEvent = (logEvent, session) => {
    return new Promise((resolve, reject) => {
        session.events.unshift(logEvent.event);
        var action = createTutorAction(logEvent, session);
        if (action) {
            session.actions.unshift(action);
            session.send('message', action);
        }           
        resolve(true);     
    });
}

function createTutorAction(logEvent, session) {

    var action = null;
        
    if (logEvent.event.event == 'Started session') {      
    } else if (logEvent.event.event == 'User logged in') {   
        session.studentId =  logEvent.event.parameters.UniqueID;   
        action = {
            type: 'dialog',
            text: '???',
            date: Date.now()
        };         
        switch(Math.floor(Math.random() * 3)) {
            case 0:
                action.text = 'Hello ' + logEvent.event.parameters.UniqueID + '! I\'m ready to help you learn about genetics.';
            break;
            case 1:
                action.text = 'Hi there!';
            break;
            case 2:
                action.text = 'Let\'s get started!';
            break;          
            default:
            action = null;
        }          
    } else if (logEvent.event.event == 'Started challenge') {      
        action = {
            type: 'dialog',
            text: '???',
            date: Date.now()
        };         
        switch(Math.floor(Math.random() * 3)) {
            case 0:
                action.text = 'I can help you with ' + logEvent.event.parameters.title;
            break;
            case 1:
                action.text = 'Ok! Let\'s get to work on ' + logEvent.event.parameters.title;
            break;
            case 2:
                action.text = 'I\'m sure you\'re up to the \'challenge\' :-). See what I did there?';
            break;          
            default:
            action = null;
        }          
    } else if (logEvent.event.event == 'Changed allele') {
        action = {
            type: 'dialog',
            text: '???',
            date: Date.now()
        };         
        switch(Math.floor(Math.random() * 6)) {
            case 0:
                action.text = 'Hmmm... something doesn\'t look quite right about that allele selection.';
            break;
            case 1:
                action.text = 'That allele selection looks correct to me.';
            break;
            case 2:
                action.text = 'You are on the right track. Keep going!';
            break;
            case 2:
                action.text = 'Perhaps you should review the info on recessive genes?';
            break;            
            default:
            action = null;
        }       
    } else if (logEvent.event.event == 'Closed info') {
        action = {
            type: 'alert',
            text: 'Student closed info',
            date: Date.now()
        };        
    } else if (logEvent.event.event == 'Completed challenge') {
        action = {
            type: 'dialog',
            text: '???',
            date: Date.now()
        };         
        switch(Math.floor(Math.random() * 3)) {
            case 0:
                action.text = 'Good work! I knew you could do it.';
            break;
            case 1:
                action.text = 'Challenge completed!';
            break;
            case 2:
                action.text = 'You got ' + logEvent.event.parameters.starsAwarded + 'stars';
            break;          
            default:
            action = null;
        }       
    }         
  
  return action;
}