const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
      id: String,
      active: Boolean,
      studentId: String,
      groupId: String,
      startTime: Date,
      endTime: Date,      
      sequenceNumber: Number,
      events: []
}, { timestamps: true });

sessionSchema.methods.logEvent = function(event) {
  this.events.push(event);
}

const Session = mongoose.model('Session', sessionSchema);
module.exports = Session;

module.exports.getAllActiveSessions = (studentId) => {
  return new Promise((resolve, reject) => { 
    var query = {'active': true};
    if (studentId) {
      query.studentId = studentId;
    }
    Session.find(query, function(err, sessions) {
      if (err) throw err;  
      resolve(sessions.sort(compareStartTime));
    });
  });
};

module.exports.getAllInactiveSessions = (studentId) => {
  return new Promise((resolve, reject) => {  
    var query = {'active': false};
    if (studentId) {
      query.studentId = studentId;
    }
    Session.find(query, function(err, sessions) {
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
        session.sequenceNumber = 0;
        //session.startTime = Date.now;
      }

      // Initialize empty collections
      if (session.events == null) {
        session.events = [];
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
    if (session.events.length > 0) {
      session.endTime = session.events[session.events.length-1].time;
    } else {
      session.endTime = Date.now();
    }
    session.save((err) => { 
        if (err) {
            console.error('Unable to save session for: ' + session.id);
        }
    });
  }

