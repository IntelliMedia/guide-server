
// Test local server: https://fiddle.jshell.net/jrqg4dkz/1/
var db = [];

exports.initialize = () => {
  return new Promise((resolve, reject) => {
    resolve();
  });
};

exports.create = (sessionId) => {
  return new Promise((resolve, reject) => {
    var newSession = {
      'id': sessionId,
      'active': false,
      'send': null, // Function used to send message to user on this session
      'studentId': null,
      'startTime': Date.now(),
      'endTime': null,      
      'events': [],
      'actions': []
    };

    db[newSession.id] = newSession;

    resolve(newSession);
  });
};

exports.delete = (sessionId) => {
  return new Promise((resolve, reject) => {  
    db.delete(sessionId);
    resolve();
  });
};

exports.findById = (sessionId) => {
  return new Promise((resolve, reject) => {  
    if (db[sessionId]) {
      resolve(db[sessionId]);
    } else {
      reject('Session with id not found: ' + sessionId);
    }
  });
};

exports.getAllActiveSessions = (cb) => {
  return new Promise((resolve, reject) => {   
    var allSessions = [];
    for(var session in db) {
      if (db[session].active) {
        allSessions.push(db[session]);
      }
    }
    resolve(allSessions.sort(compareStartTime));
  });
};

exports.getAllInactiveSessions = (cb) => {
  return new Promise((resolve, reject) => {   
    var allSessions = [];
    for(var session in db) {
      if (!db[session].active) {
        allSessions.push(db[session]);
      }
    }
    resolve(allSessions.sort(compareStartTime));
  });
};

function compareStartTime(a,b) {
  if (a.startTime > b.startTime)
    return -1;
  if (a.startTime < b.startTime)
    return 1;
  return 0;
}