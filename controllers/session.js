const consolex = require('../utilities/consolex');
const sessionRepository = require('./sessionRepository');

/**
 * GET /
 * Session page.
 */
exports.index = (req, res) => {
  const sessionId = req.params.sessionId;
  if (!sessionId) {
    return res.redirect('/sessions');
  }

  sessionRepository.findById(sessionId).then((session) => {
    res.render('session', {
      title: 'Session',
      session: session
    });
  })
  .catch((err) => {
    consolex.exception(erro);
    req.flash('errors', { msg: 'Session with ID is not active: ' + sessionId});
    return res.redirect('/sessions');
  });
};

exports.event = (req, res) => {
  const sessionId = req.params.sessionId;
  const eventIndex = req.params.eventIndex;
  if (!sessionId || !eventIndex) {
    return res.redirect('/sessions');
  }

  sessionRepository.findById(sessionId).then((session) => {
    res.render('event', {
      title: 'Event',
      session: session,
      eventStr: JSON.stringify(session.events[eventIndex], undefined, 2)
    });
  })
  .catch((err) => {
      consolex.exception(err);
      req.flash('errors', { msg: 'Session with ID is not active: ' + sessionId});
      return res.redirect('/sessions');
  });
};

exports.action = (req, res) => {
  const sessionId = req.params.sessionId;
  const actionIndex = req.params.actionIndex;
  if (!sessionId || !actionIndex) {
    return res.redirect('/sessions');
  }

  sessionRepository.findById(sessionId).then((session) => {
    res.render('action', {
      title: 'Action',
      session: session,
      actionStr: JSON.stringify(session.actions[actionIndex], undefined, 2)
    });
  })
  .catch((err) => {
      consolex.exception(err);
      req.flash('errors', { msg: 'Session with ID is not active: ' + sessionId});
      return res.redirect('/sessions');
  });  
};