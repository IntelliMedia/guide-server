const sessionRepository = require('./sessionRepository');
const moment = require('moment');

/**
 * GET /
 * Monitor page.
 */
exports.index = (req, res) => {
  var activeSessions = [];
  sessionRepository.getAllActiveSessions().then((sessions) => {
    activeSessions = sessions;
    return sessionRepository.getAllInactiveSessions();
  }).then((inactiveSessions) => {
    res.render('monitor', {
      title: 'Monitor',
      activeSessions: activeSessions,
      inactiveSessions: inactiveSessions
    });
  }).catch((err) => {
    req.flash('errors', { msg: err });
  });
};
