const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
      id: String,
      active: Boolean,
      studentId: String,
      classId: String,
      groupId: String,
      startTime: Date,
      endTime: Date,      
      sequence: Number,
      events: []
}, { timestamps: true });

sessionSchema.statics.findOrCreate = (sessionId) => {
  return new Promise((resolve, reject) => {
    Session.findOne({ 'id': sessionId }, (err, session) => {
      if (err) {
        reject(err);
      }

      if (!session) {
        session = new Session();
        session.id = sessionId;
        session.sequence = -1;
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

sessionSchema.statics.deactivate = (session) => {
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

  sessionSchema.statics.getAllActiveSessions = (studentId) => {
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
  
  sessionSchema.statics.getAllInactiveSessions = (studentId) => {
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

sessionSchema.methods.logEvent = function(event) {
  this.events.push(event);
}

sessionSchema.methods.errorAlert = function(e) {
    console.error(e); 
    return this.sendAlert(GuideProtocol.Alert.Error, e.toString(), true);
}

sessionSchema.methods.warningAlert = function(msg) {
    console.warn(msg);
    return this.sendAlert(GuideProtocol.Alert.Warning, msg, true);
}

sessionSchema.methods.infoAlert = function(msg) {
    console.info(msg);
    return this.sendAlert(GuideProtocol.Alert.Info, msg, true);
}

sessionSchema.methods.debugAlert = function(msg) {
    console.log(msg);
    return this.sendAlert(GuideProtocol.Alert.Debug, msg);
}

sessionSchema.methods.sendAlert = function(type, msg, writeToEventLog) {

  let context = {
    type: type,
    message: msg
  };

  let event = new GuideProtocol.Event(
    this.studentId,
    this.id,
    "ITS", "ISSUED", "ALERT",
    context);

  if (!this.emit) {
    console.error("Unable to send alert message to client. Emit method is not defined.");
  } else {
    this.emit(GuideProtocol.Event.Channel, event.toJson());
  }

  if (writeToEventLog) {
    this.logEvent(event);
  }
   
  return event;
}

const Session = mongoose.model('Session', sessionSchema);
module.exports = Session;

