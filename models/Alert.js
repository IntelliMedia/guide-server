const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  timestamp: Date,
  type: String,
  message: String,
  details: String
}, { timestamps: false });

alertSchema.statics.error = function(err, session, event) {
  if (session) {
    session.errorAlert(err);
  } else {
      console.error(err);
  }

  let details = session ? JSON.stringify(session, null, 2) + "\n\n" : "";
  details += err.stack;

  let newAlert = Alert({
          type: 'error',
          timestamp: (event ? event.time : Date.now()),
          message: err.message,
          details: details
      });
  newAlert.save(); 
}

const Alert = mongoose.model('Alert', alertSchema);

module.exports = Alert;
