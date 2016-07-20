
var db = [];

exports.initialize = (cb) => {
    cb();
};

exports.create = (sessionId, studentId, cb) => {
  var newSession = {
    'id': sessionId,
    'studentId': studentId,
    'startTime': Date.now(),
    'events': [],
    'actions': []
  };

  db[newSession.id] = newSession;

  cb(newSession);
};

exports.delete = (sessionId, cb) => {
  db.delete(sessionId);
  cb();
};

exports.findById = (sessionId, cb) => {
  if (db[sessionId]) {
    cb(db[sessionId]);
  } else {
    cb(null, 'Session does not exist with id:' + sessionId)
  }
};

exports.findOrCreate = (sessionId, cb) => {
  if (db[sessionId]) {
    cb(db[sessionId]);
  } else {
    exports.create(sessionId, "[not signed in]", cb)
  }
};

exports.all = (cb) => {
  var allSessions = [];
  for(var session in db) {
    allSessions.push(db[session]);
  }
  cb(allSessions);
};