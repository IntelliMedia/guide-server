const Alert = require('../models/Alert');
const moment = require('moment');

/**
 * GET /
 * Alerts page.
 */
exports.index = (req, res) => {
  Alert.find({}).sort({timestamp: -1}).exec().then((alerts) => {
    res.render('alerts', {
      title: 'Alerts',
      alerts: alerts
    });
  }).catch((err) => {
    console.error(err);
    req.flash('errors', { msg: err.toString() });
    res.render('alerts', {
      title: 'Alerts',
      alerts: []
    });
  });
};

exports.alert = (req, res) => {
  const id = req.params.alertId;
  if (!id) {
    return res.redirect(process.env.BASE_PATH + 'alerts');
  }

  Alert.findOne({ '_id': id }).exec()
    .then((alert) => {
      let data = {
        title: 'Alert Details',
        message: alert.message,
        stack: alert.stack
      };

      if (alert.sessionId && alert.sessionId != "") {
        data.sessionId = alert.sessionId;
      }

      if (alert.eventJson && alert.eventJson != "") {
        data.eventJson = alert.eventJson;
      }

      res.render('alert', data);
    })
    .catch((err) => {
      console.error(err);
      req.flash('errors', { msg: 'Unable to display alert: ' + err.toString()});
      return res.redirect(process.env.BASE_PATH + 'alerts');
    });   
};

exports.clear = (req, res) => {
  Alert.remove({}).then(() => {
    return res.redirect(process.env.BASE_PATH + 'alerts');
  }).catch((err) => {
    console.error(err);
    req.flash('errors', { msg: err.toString() });
  });
};
