const Alert = require('../models/Alert');
const Audit = require('../models/Audit');
const moment = require('moment');
const paginate = require('express-paginate');
const MongoQS = require('mongo-querystring');

/**
 * GET /
 * Alerts page.
 */
exports.index = (req, res) => {
  var qs = new MongoQS();
  let filter = qs.parse(req.query);

  let itemCount = 0;
  Alert.count(filter)
    .then((resultsCount) => {
        itemCount = resultsCount;
        return Alert.find(filter).sort({timestamp: -1}).limit(req.query.limit).skip(req.skip).lean().exec();
    })
    .then((alerts) => {
      const pageCount = Math.ceil(itemCount / req.query.limit);

      res.render('alerts', {
        title: 'Alerts',
        alerts: alerts,
        pageCount,
        itemCount,
        pages: paginate.getArrayPages(req)(3, pageCount, req.query.page)
      });
    })
    .catch((err) => {
      Alert.flash(req, 'Unable to display alerts page', err);
      res.render('error');
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
      Alert.flash(req, 'Unable to display alert page', err);
      return res.redirect(process.env.BASE_PATH + 'alerts');
    });
};

exports.clear = (req, res) => {
  Audit.record(req.user.email, 'deleted', 'all alerts');
  Alert.remove({}).then(() => {
    return res.redirect(process.env.BASE_PATH + 'alerts');
  }).catch((err) => {
    Alert.flash(req, 'Unable to delete alerts', err);
    return res.redirect(process.env.BASE_PATH + 'alerts');
  });
};
