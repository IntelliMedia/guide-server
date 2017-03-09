const consolex = require('../utilities/consolex');
const Session = require('../models/Session');
const moment = require('moment');

/**
 * GET /
 * Sessions page.
 */
exports.index = (req, res) => {
  var activeSessions = [];
  Session.getAllActiveSessions().then((sessions) => {
    activeSessions = sessions;
    return Session.getAllInactiveSessions();
  }).then((inactiveSessions) => {
    res.render('sessions', {
      title: 'Sessions',
      activeSessions: activeSessions,
      inactiveSessions: inactiveSessions
    });
  }).catch((err) => {
    console.error(err);
    req.flash('errors', { msg: err });
  });
};

exports.modify = (req, res) => {
  if (req.body.action == 'deleteAll') {
    console.info("Delete all sessions.");
    Session.remove({}, (err) => {
      return res.redirect('/sessions');
    });
  }
  else if (req.body.action == 'deactivateAll') {
    console.info("Deactivate all sessions.");
    Session.getAllActiveSessions().then((sessions) => {
      for (let session of sessions) {
        Session.deactivate(session);
      }
      return res.redirect('/sessions');
    }).catch((err) => {
      console.error(err);
      req.flash('errors', { msg: err });
    });
  }
};