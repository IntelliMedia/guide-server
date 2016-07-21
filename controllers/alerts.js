const Alert = require('../models/Alert');
const moment = require('moment');

/**
 * GET /
 * Alerts page.
 */
exports.index = (req, res) => {
  Alert.find({}, (err, alerts) => {
    res.render('alerts', {
      title: 'Alerts',
      alerts: alerts
    });
  });
};

exports.clear = (req, res) => {
  Alert.remove({}, (err) => {
    return res.redirect('/alerts');
  });
};
