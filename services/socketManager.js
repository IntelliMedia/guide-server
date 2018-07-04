const http = require('http');
const socketio = require('socket.io');
const Session = require('../models/Session');
const EventRouter = require('./eventRouter');
const Alert = require('../models/Alert');
const guideProtocol = require('../shared/guide-protocol.js');

/**
 * Configuration
 * TODO move to config settings
 */
const GuideSocketioNamespace = 'guide-protocol';

var socketMap = {};

exports.initialize = (server) => {
    initializeV3(server);
}

function  initializeV3(server) {
    let socketPath = process.env.BASE_PATH + "socket.io";

    var ioServer = socketio.listen(server, {
        path: socketPath
    });
    ioServer.on('connect_error', function(err) {
        handleConnectError(err);
    });

    let address = server.address().address == "::" ? "[::]" : server.address().address;
    console.info("socket.io listening on: %s:%d%s namespace:%s", address, server.address().port, socketPath, GuideSocketioNamespace);

    ioServer.of(GuideSocketioNamespace).on('connection', function(socket) {
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
    console.info('Connected to ' + address);      
}

function handleConnectError(err) {
    console.error('Connect failed: ' + err);     
}

function handleDisconnect(socket) {
    var address = socket.handshake.address;
    console.info('Disconnected from ' + address);
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
        console.info("Received: " + event.toString() + " user=" + event.studentId);
        console.log("Event: " + JSON.stringify(event, null, '\t'));
        return findSession(socket, receivedEvent.studentId, receivedEvent.session); 
    })
    .then((session) => { 
        currentSession = session;
        let eventRouter = new EventRouter();
        return eventRouter.processAsync(currentSession, receivedEvent);
    })        
    .catch((err) => { 
        Alert.error(err, currentSession, receivedEvent); 
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

            Session.findOrCreate(sessionId).then((session) => {
                socketMap[socket] = session;
                initializeSessionSocket(session, socket);
                resolve(session);         
            }).catch((err) => {
                console.error(err);
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