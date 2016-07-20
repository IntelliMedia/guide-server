const sessionRepository = require('./sessionRepository');

/**
 * GET /
 * Session page.
 */
exports.index = (req, res) => {
  const sessionId = req.params.sessionId;
  if (!sessionId) {
    return res.redirect('/monitor');
  }

  sessionRepository.findById(sessionId, (session) => {

    if (!session) {
      req.flash('errors', { msg: 'Session with ID is not active: ' + sessionId});
      return res.redirect('/monitor');
    }

    res.render('session', {
      title: 'Session',
      session: session
    });
  });
};

exports.event = (req, res) => {
  const sessionId = req.params.sessionId;
  const eventIndex = req.params.eventIndex;
  if (!sessionId || !eventIndex) {
    return res.redirect('/monitor');
  }

  sessionRepository.findById(sessionId, (session) => {

    if (!session) {
      req.flash('errors', { msg: 'Session with ID is not active: ' + sessionId});
      return res.redirect('/monitor');
    }

    res.render('event', {
      title: 'Event',
      session: session,
      eventStr: JSON.stringify(session.events[eventIndex], undefined, 2)
    });
  });
};

exports.action = (req, res) => {
  const sessionId = req.params.sessionId;
  const actionIndex = req.params.actionIndex;
  if (!sessionId || !actionIndex) {
    return res.redirect('/monitor');
  }

  sessionRepository.findById(sessionId, (session) => {

    if (!session) {
      req.flash('errors', { msg: 'Session with ID is not active: ' + sessionId});
      return res.redirect('/monitor');
    }

    res.render('action', {
      title: 'Action',
      session: session,
      actionStr: JSON.stringify(session.actions[actionIndex], undefined, 2)
    });
  });
};