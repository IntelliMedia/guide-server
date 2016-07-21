
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
      'send': null, // Function used to send message to user on this session
      'studentId': null,
      'startTime': Date.now(),
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

exports.all = (cb) => {
  return new Promise((resolve, reject) => {   
    var allSessions = [];
    for(var session in db) {
      allSessions.push(db[session]);
    }
    resolve(allSessions);
  });
};