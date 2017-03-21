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

    const format = req.query.format; 
    if (format && format.toLowerCase() == "json") {
      res.attachment(session.id + ".json");
      res.json(session.events);
    } else {
      res.render('session', {
        title: 'Session',
        session: session
      });
    }
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

    res.render('json', {
      title: 'Event JSON',
      json: JSON.stringify(session.events[eventIndex], undefined, 2)
    });
  })
  .exec()
  .catch((err) => {
    consolex.exception(err);
    req.flash('errors', { msg: 'Session with ID is not found: ' + studentId});
    return res.redirect('/sessions');
  });   
};
