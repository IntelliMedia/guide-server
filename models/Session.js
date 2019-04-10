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

    // The current challenge is different than the most recent challenge
    if (previousEvent.context.hasOwnProperty("challengeId")
      && event.context.hasOwnProperty("challengeId")
      && previousEvent.context.challengeId != event.context.challengeId) {
      break;
    }

    // We're in remediation and wasn't previously
    if (previousEvent.context.hasOwnProperty("remediation")
      && event.context.hasOwnProperty("remediation")
      && previousEvent.context.remediation != event.context.remediation) {
      break;
    }

    // It's been more than 10 minutes since the last submission
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

const Session = mongoose.model('Session', sessionSchema);
module.exports = Session;

