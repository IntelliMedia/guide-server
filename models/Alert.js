const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  timestamp: Date,
  type: String,
  message: String,
  stack: String,
  sessionId: String,
  eventJson: String
}, { timestamps: false });

alertSchema.statics.flash = function(req, message, err) {
  console.error(message);
  if (err) {
    console.error(err);
  }

  let errMsg = err ? '. ' + err.toString() : '';
  let flashMsg = { msg: `${message}${errMsg}`};

  req.flash('errors', flashMsg);

  let stack = err ? err.stack : undefined;

  let newAlert = Alert({
          type: 'error',
          timestamp: Date.now(),
          message: flashMsg.msg,
          stack: stack,
          sessionId: '',
          eventJson: '{}'
      });
  newAlert.save();
}

alertSchema.statics.error = function(msg, err, session, event, socket) {

  // Does error have optional message?
  if (msg) {
    console.error(msg);
  } else {
    msg = err.toString();
  }

  if (err) {
    console.error(err);
  }
  return this.processAlert(GuideProtocol.Alert.Error, msg, err, session, event, socket);
}

alertSchema.statics.warning = function(msg, session, event, socket) {
  console.warn(msg);
  return this.processAlert(GuideProtocol.Alert.Warning, msg, null, session, event, socket);
}

alertSchema.statics.info = function(msg, session, event, socket) {
  console.info(msg);
  return this.processAlert(GuideProtocol.Alert.Info, msg, null, session, event, socket);
}

alertSchema.statics.debug = function(msg, session, event, socket) {
  console.log(msg);
  return this.processAlert(GuideProtocol.Alert.Debug, msg, null, session, event, socket);
}

alertSchema.statics.create = function(type, msg, err, session, event) {

  let stack = err ? err.stack : "";
  let eventJson = event ? JSON.stringify(event, null, 2) : "";
  let sessionId = (session ? session.id : undefined);

  let newAlert = Alert({
          type: type.toLowerCase(),
          timestamp: (event ? event.time : Date.now()),
          message: msg,
          stack: stack,
          sessionId: sessionId,
          eventJson: eventJson
      });

  newAlert.save();
}

alertSchema.statics.processAlert = function(type, msg, err, session, event, socket) {

  // If the socket wasn't explicitly passed in, attempt to use the socket 
  // associated with the session
  if (!socket) {
    socket = session.socket;
  }

  // Record alert in database to be displayed in admin UI
  if (type == GuideProtocol.Alert.Error) {
    Alert.create(type, msg, err, session, event);
  }

  let context = {
    type: type,
    message: msg
  };

  if (err) {
    context.error = err.toString();
  }

  let alertEvent = new GuideProtocol.Event(
    (session ? session.studentId : undefined),
    (session ? session.id : undefined),
    "ITS", "ISSUED", "ALERT",
    context);

  // Send alert to client
  if (socket) {
    socket.emit(GuideProtocol.Event.Channel, alertEvent.toJson());
  } else {
    console.warn("Unable to send alert message to client: socket is undefined.");
  }

  // Record alert in session events
  if (session) {
    if (type != GuideProtocol.Alert.Debug) {
      session.logEvent(alertEvent);
    }
  } else {
    console.warn("Unable to log alert to session events: session is undefined.");
  }

  return alertEvent;
}

const Alert = mongoose.model('Alert', alertSchema);

module.exports = Alert;
