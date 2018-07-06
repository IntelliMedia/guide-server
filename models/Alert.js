const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  timestamp: Date,
  type: String,
  message: String,
  stack: String,
  sessionId: String,
  eventJson: String
}, { timestamps: false });

alertSchema.statics.error = function(err, session, event) {
  if (session) {
    session.errorAlert(err);
  } else {
      console.error(err);
  }

  let stack = err.stack;
  let sessionId = session ? session.id : "";
  let eventJson = event ? JSON.stringify(event, null, 2) : "";

  let newAlert = Alert({
          type: 'error',
          timestamp: (event ? event.time : Date.now()),
          message: err.message,
          stack: stack,
          sessionId: sessionId,
          eventJson: eventJson
      });
  newAlert.save(); 
}

const Alert = mongoose.model('Alert', alertSchema);

module.exports = Alert;
