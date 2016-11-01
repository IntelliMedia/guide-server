const consolex = require('../utilities/consolex');
const sessionRepository = require('./sessionRepository');
const moment = require('moment');

/**
 * GET /
 * Sessions page.
 */
exports.index = (req, res) => {
  var activeSessions = [];
  sessionRepository.getAllActiveSessions().then((sessions) => {
    activeSessions = sessions;
    return sessionRepository.getAllInactiveSessions();
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
