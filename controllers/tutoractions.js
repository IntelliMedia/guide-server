"use strict";

/**
 * Configuration
 * TODO move to config settings
 */
const TutorActionProtocol = 'tutor-actions-v1';

const http = require('http');
const WebSocketServer = require('websocket').server;

exports.listen = (server) => {

    var wsServer = new WebSocketServer({
        httpServer: server,
        // You should not use autoAcceptConnections for production
        // applications, as it defeats all standard cross-origin protection
        // facilities built into the protocol and the browser.  You should
        // *always* verify the connection's origin and decide whether or not
        // to accept it.
        autoAcceptConnections: false
    });

    // TODO student mode -> record student’s domain knowledge, problem-solving state, and task history.
    // TODO tutorial planner ->  that plans curricular sequencing, provides hints, generates explanations, and supplies feedback.

    wsServer.on('request', function(request) {
        if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin
        request.reject();
        console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
        return;
        }

        var connection = request.accept(TutorActionProtocol, request.origin);
        console.log((new Date()) + ' Connection accepted.');
        connection.on('message', function(message) {
            if (message.type === 'utf8') {
                console.log('Received Message: ' + message.utf8Data);
                connection.sendUTF(message.utf8Data);
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
