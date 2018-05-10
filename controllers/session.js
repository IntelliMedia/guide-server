const Session = require('../models/Session');

/**
 * GET /
 * Session page.
 */
exports.index = (req, res) => {
  const sessionId = req.params.sessionId;
  if (!sessionId) {
    return res.redirect(process.env.BASE_PATH + 'sessions');
  }

  Session.findOne({ 'id': sessionId }).exec()
    .then((session) => {
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
    .catch((err) => {
      console.error(err);
      req.flash('errors', { msg: 'Unable to display session data. ' + err.toString()});
      return res.redirect(process.env.BASE_PATH + 'sessions');
    }); 
};

exports.event = (req, res) => {
  const sessionId = req.params.sessionId;
  const eventIndex = req.params.eventIndex;
  if (!sessionId || !eventIndex) {
    return res.redirect(process.env.BASE_PATH + 'sessions');
  }

  Session.findOne({ 'id': sessionId }).exec()
    .then((session) => {
      res.render('json', {
        title: 'Event JSON',
        json: JSON.stringify(session.events[eventIndex], undefined, 2)
      });
    })
    .catch((err) => {
      console.error(err);
      req.flash('errors', { msg: 'Unable to display session data. ' + err.toString()});
      return res.redirect(process.env.BASE_PATH + 'sessions');
    });   
};
