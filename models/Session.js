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
    return Session.findOne({ 'id': sessionId }).exec()
      .then((session) => {
        if (!session) {
          session = new Session();
          session.id = sessionId;
          session.sequence = -1;
          session.events = [];
          return session.save();
          //session.startTime = Date.now;
        } else {
          return Promise.resolve(session);
        }
      })
      .catch((err) => {
        console.error('Unable to find or create session for: ' + session.id);
      });
}

sessionSchema.methods.logEvent = function(event) {
  this.events.push(event);
}

sessionSchema.methods.findPreviousEvent = function(event) {
  let foundEvent = null;
  for(let i = (this.events.length - 2); i >= 0; --i) {
    let previousEvent = this.events[i];
    // Situations that indicate a previous event can't be found
    if (!previousEvent.context.hasOwnProperty("challengeId")
      || previousEvent.context.challengeId != event.context.challengeId) {
      break;
    }

    if (previousEvent.context.hasOwnProperty("remediation")
      && previousEvent.context.remediation != event.context.remediation) {
      break;
    }

    if (event.time - previousEvent.time > 600000) {
      break;
    }

    // Is this the same event type?
    if (previousEvent.actor === event.actor
      && previousEvent.action === event.action
      && previousEvent.target === event.target) {
        foundEvent = previousEvent;
        break;
      }
  }

  return foundEvent;
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

