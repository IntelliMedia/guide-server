const consolex = require('../utilities/consolex');
const Session = require('../models/Session');

/**
 * GET /
 * Session page.
 */
exports.index = (req, res) => {
  const sessionId = req.params.sessionId;
  if (!sessionId) {
    return res.redirect('/sessions');
  }

  Session.findOne({ 'id': sessionId }, (err, session) => {
    if (err) { return next(err); }

    res.render('session', {
      title: 'Session',
      session: session
    });
  })
  .exec()
  .catch((err) => {
    consolex.exception(err);
    req.flash('errors', { msg: 'Session with ID is not found: ' + studentId});
    return res.redirect('/sessions');
  }); 
};

exports.event = (req, res) => {
  const sessionId = req.params.sessionId;
  const eventIndex = req.params.eventIndex;
  if (!sessionId || !eventIndex) {
    return res.redirect('/sessions');
  }

  Session.findOne({ 'id': sessionId }, (err, session) => {
    if (err) { return next(err); }

    res.render('event', {
      title: 'Event',
      session: session,
      eventStr: JSON.stringify(session.events[eventIndex], undefined, 2)
    });
  })
  .exec()
  .catch((err) => {
    consolex.exception(err);
    req.flash('errors', { msg: 'Session with ID is not found: ' + studentId});
    return res.redirect('/sessions');
  });   
};

exports.action = (req, res) => {
  const sessionId = req.params.sessionId;
  const actionIndex = req.params.actionIndex;
  if (!sessionId || !actionIndex) {
    return res.redirect('/sessions');
  }

  Session.findOne({ 'id': sessionId }, (err, session) => {
    if (err) { return next(err); }

    res.render('action', {
      title: 'Action',
      session: session,
      actionStr: JSON.stringify(session.actions[actionIndex], undefined, 2)
    });
  })
  .exec()
  .catch((err) => {
    consolex.exception(err);
    req.flash('errors', { msg: 'Session with ID is not found: ' + studentId});
    return res.redirect('/sessions');
  });   
};