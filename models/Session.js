const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
      id: String,
      active: Boolean,
      studentId: String,
      startTime: Date,
      endTime: Date,      
      events: [],
      actions: []  
}, { timestamps: true });

const Session = mongoose.model('Session', sessionSchema);
module.exports = Session;

module.exports.getAllActiveSessions = () => {
  return new Promise((resolve, reject) => {  
    Session.find({'active': true}, function(err, sessions) {
      if (err) throw err;  
      resolve(sessions.sort(compareStartTime));
    });
  });
};

module.exports.getAllInactiveSessions = () => {
  return new Promise((resolve, reject) => {  
    Session.find({'active': false}, function(err, sessions) {
      if (err) throw err;  
      resolve(sessions.sort(compareStartTime));
    });
  });
};

function compareStartTime(a,b) {
  if (a.startTime > b.startTime)
    return -1;
  if (a.startTime < b.startTime)
    return 1;
  return 0;
}

module.exports.createOrFind = (sessionId) => {
  return new Promise((resolve, reject) => {
    Session.findOne({ 'id': sessionId }, (err, session) => {
      if (err) {
        reject(err);
      }

      if (!session) {
        session = new Session();
        session.id = sessionId;
        //session.startTime = Date.now;
      }

      // Initialize empty collections
      if (session.events == null) {
        session.events = [];
      }

      if (session.actions == null) {
        session.actions = [];
      }

      session.save((err) => {
        if (err) {
          reject(err);
        } else {
          resolve(session);
        }
      });
    });
  });
}

module.exports.deactivate = (session) => {
    session.active = false;
    session.endTime = Date.now();
    session.save((err) => { 
        if (err) {
            console.error('Unable to save session for: ' + session.id);
        }
    });
  }
