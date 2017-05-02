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
const GuideProtocolVersion= 'guide-protocol-v3';

var socketMap = {};

exports.initialize = (server) => {
    initializeV3(server);
}

function  initializeV3(server) {
    var ioServer = socketio.listen(server);
    ioServer.on('connect_error', function(err) {
        handleConnectError(err);
    });

    ioServer.of('/' + GuideProtocolVersion).on('connection', function(socket) {
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
    var currentSession = null;
    GuideProtocol.Event.fromJsonAsync(data).then((event) => {
        receivedEvent = event;
        console.info("SocketManager - incoming: " + event.toString() + " user=" + event.studentId);
        // TODO - control with debug flag
        console.info("Event: " + JSON.stringify(event, null, '\t'));
        return findSession(socket, receivedEvent.studentId, receivedEvent.session); 
    })
    .then((session) => { 
        currentSession = session;
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
        if (currentSession) {
            var event = new GuideProtocol.Event(
                currentSession.studentId,
                currentSession.id, 
                currentSession.sequenceNumber++,
                "ITS", "ISSUED", "ALERT", alert
            );
            currentSession.logEvent(event);
            currentSession.save();
        }
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
        if (!sessionId) {
            throw new Error("sessionId is blank");
        }

        if (!studentId) {
            throw new Error("studentId is blank");
        }

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