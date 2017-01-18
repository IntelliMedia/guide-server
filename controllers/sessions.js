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
    consolex.exception(err);
    req.flash('errors', { msg: err });
  });
};
