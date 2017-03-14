const consolex = require('../utilities/consolex');
const http = require('http');
const socketio = require('socket.io');
const WebSocketServer = require('websocket').server;
const Session = require('../models/Session');
const tutor = require('./tutor');
const Alert = require('../models/Alert');
const guideProtocol = require('../shared/guide-protocol.js');

/**
 * Configuration
 * TODO move to config settings
 */
const GuideProtocolV1 = 'tutor-actions-v1';
const GuideProtocolV2 = 'guide-protocol-v2';

var socketMap = {};

exports.initialize = (server) => {
    initializeV2(server);
}

function  initializeV2(server) {
    var ioServer = socketio.listen(server);
    ioServer.on('connect_error', function(err) {
        handleConnectError(err);
    });

    ioServer.of('/' + GuideProtocolV2).on('connection', function(socket) {
       handleConnect(socket);

        socket.on('disconnect', function () {
            handleDisconnect(socket);
        });       
 
        socket.on(GuideProtocol.Event.Channel, function(data) {      
            handleEvent(socket, data);      
        });
    });      
}

function handleConnect(socket) {
    var address = socket.handshake.address;
    console.log('Connected to ' + address);      
}

function handleConnectError(err) {
    console.error('Connect failed: ' + err);     
}

function handleDisconnect(socket) {
    var address = socket.handshake.address;
    console.log('Disconnected from ' + address);
    findSessionBySocket(socket).then((session) => {
        if (session && session.active) {
            Session.deactivate(session);
        }
    })            
}

function handleEvent(socket, data) {

    var receivedEvent = null;
    GuideProtocol.Event.fromJsonAsync(data).then((event) => {
        receivedEvent = event;
        console.info("SocketManager - incoming: " + event.toString() + " user=" + event.username);
        return findSession(socket, receivedEvent.username, receivedEvent.session); 
    })
    .then((session) => { 
        return tutor.processEventAsync(receivedEvent, session);
    })        
    .catch((err) => {
        consolex.exception(err);

        const newAlert = Alert();
        newAlert.type = 'error';
        newAlert.timestamp = Date.now();
        newAlert.message = err.message;
        newAlert.save();
        
        var alert = new GuideProtocol.Alert(GuideProtocol.Alert.Error, err.message);
        socket.emit(GuideProtocol.Alert.Channel, alert.toJson());
    });
}

function findSessionBySocket(socket) {
    return new Promise((resolve, reject) => {
        if (!socket) {
            reject('Cannot find session since socket is null');
        }

        if (socketMap[socket]) {
            return resolve(socketMap[socket]);
        } else {
            return resolve(null);
        }        
    });
}

function findSession(socket, studentId, sessionId) {
    return new Promise((resolve, reject) => {
        if (!socket) {
            reject('Cannot find session since socket is null');
        }

        if (socketMap[socket] && socketMap[socket].id == sessionId) {
            initializeSessionSocket(socketMap[socket], socket)
            return resolve(socketMap[socket]);
        }
        
        if (sessionId) {

            Session.createOrFind(sessionId).then((session) => {
                socketMap[socket] = session;
                initializeSessionSocket(session, socket);
                resolve(session);         
            }).catch((err) => {
                consolex.exception(err);
                reject(err);                
            });            

        } else {
            reject('Unable to find session with id: ' + sessionId);
        }
    });
}

function initializeSessionSocket(session, socket) {
    if (session.socket != socket) {
        session.socket = socket;
        session.emit = (channel, message) => {
            socket.emit(channel, message);
        };                    
    }    
}

/*
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
*/