const http = require('http');
const socketio = require('socket.io');
const WebSocketServer = require('websocket').server;
const sessionRepository = require('./sessionRepository');
const tutor = require('./tutor');
const Alert = require('../models/Alert');

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
 
        socket.on('event', function(data) {      
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
}

function handleEvent(socket, data) {
    var logEvent = JSON.parse(data);
    console.log('Received event: ' + logEvent.event.time);

    findSession(socket, logEvent.event.session).then((session) => {
        return tutor.processEvent(logEvent, session);
    })        
    .catch((err) => {
        const newAlert = Alert();
        newAlert.type = 'error';
        newAlert.timestamp = Date.now();
        newAlert.message = err;
        newAlert.save();
        console.error('Failed to process event: ' + err);
    });
}

function findSession(socket, sessionId) {
    return new Promise((resolve, reject) => {
        if (!socket) {
            reject('Cannot find session since socket is null');
        }

        if (socketMap[socket] && socketMap[socket].id == sessionId) {
            return resolve(socketMap[socket]);
        }
        if (sessionId) {
            sessionRepository.findById(sessionId).then((session) => {
                socketMap[socket] = session;
                resolve(session);
            })
            .catch((err) => {
                sessionRepository.create(sessionId).then((session) => {
                    socketMap[socket] = session;
                    session.send = (type, message) => {
                        console.log('Sent event: ' + message.tutorAction.type); 
                        socket.emit(type, JSON.stringify(message)); 
                    };
                    resolve(session);
                })
                .catch((err) => {
                    reject(err);
                })
            });
        } else {
            reject('Unable to find session with id: ' + sessionId);
        }
    });
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