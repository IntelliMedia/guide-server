const sessionRepository = require('./sessionRepository');

/**
 * Configuration
 * TODO move to config settings
 */
const GuideProtocolV1 = 'tutor-actions-v1';
const GuideProtocolV2 = 'guide-protocol-v2';

const http = require('http');
const socketio = require('socket.io');
const WebSocketServer = require('websocket').server;

exports.initialize = (server) => {
    initializeV2(server);
}

function  initializeV2(server) {
    var ioServer = socketio.listen(server);
    ioServer.on('connect_error', function(err) {
        console.error('Connect failed: ' + err);
    });
    ioServer.on('connection', function(socket) {
        var address = socket.handshake.address;
        console.log('Connected to ' + address);         
 
        socket.on('event', function(data) {
            console.log('Received event: ' + data);
            var logEvent = JSON.parse(data);
            handleIncomingEvent(logEvent, socket);       
        });
    });      
}

function  initializeV1(server) {

    var wsServer = new WebSocketServer({
        httpServer: server,
        // You should not use autoAcceptConnections for production
        // applications, as it defeats all standard cross-origin protection
        // facilities built into the protocol and the browser.  You should
        // *always* verify the connection's origin and decide whether or not
        // to accept it.
        autoAcceptConnections: false
    });

    wsServer.on('request', function(request) {
        if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin
        request.reject();
        console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
        return;
        }

        var connection = request.accept(GuideProtocolV1, request.origin);
        console.log((new Date()) + ' Connection accepted.');
        connection.on('message', function(message) {
            if (message.type === 'utf8') {
                console.log('Received Message: ' + message.utf8Data);
                var logEvent = JSON.parse(message.utf8Data);
                var action = handleIncomingEvent(logEvent);
                if (action) {
                    connection.sendUTF(JSON.stringify(action));
                }                
            }
            else if (message.type === 'binary') {
                console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
                connection.sendBytes(message.binaryData);
            }
        });
        connection.on('close', function(reasonCode, description) {
            console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
        });
    });
}

function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}

// TODO student mode -> record student’s domain knowledge, problem-solving state, and task history.
// TODO tutorial planner ->  that plans curricular sequencing, provides hints, generates explanations, and supplies feedback.
// TODO Wrap in v1 module file

function handleIncomingEvent(logEvent, socket) {
    sessionRepository.findOrCreate(logEvent.event.session, (session) => {
        session.events.unshift(logEvent.event);
        var action = createTutorAction(logEvent, session);
        if (action) {
            session.actions.unshift(action);
            socket.emit('message', JSON.stringify(action));
        }                
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