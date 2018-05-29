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
    return res.redirect(process.env.BASE_PATH + '');
  });
};

exports.alert = (req, res) => {
  const id = req.params.alertId;
  if (!id) {
    return res.redirect(process.env.BASE_PATH + 'alerts');
  }

  Alert.findOne({ '_id': id }).exec()
    .then((alert) => {
      res.render('json', {
        title: 'Alert Details',
        json: "{'" + alert.details + "'}"
      });
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
