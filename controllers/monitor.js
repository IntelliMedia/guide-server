const sessionRepository = require('./sessionRepository');
const moment = require('moment');

/**
 * GET /
 * Monitor page.
 */
exports.index = (req, res) => {
  sessionRepository.all().then((sessions) => {
    res.render('monitor', {
      title: 'Monitor',
      sessions: sessions
    });
  });
};
