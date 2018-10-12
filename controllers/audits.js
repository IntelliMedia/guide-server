const Audit = require('../models/Audit');
const moment = require('moment');
const paginate = require('express-paginate');
const MongoQS = require('mongo-querystring');
const Alert = require('../models/Alert');

/**
 * GET /
 * Audits page.
 */
exports.index = (req, res) => {
  var qs = new MongoQS();
  let filter = qs.parse(req.query);

  let itemCount = 0;
  Audit.count(filter)
    .then((resultsCount) => {
        itemCount = resultsCount;
        return Audit.find(filter).sort({timestamp: -1}).limit(req.query.limit).skip(req.skip).lean().exec();
    })
    .then((audits) => {
      const pageCount = Math.ceil(itemCount / req.query.limit);

      res.render('audits', {
        title: 'Audits',
        audits: audits,
        pageCount,
        itemCount,
        pages: paginate.getArrayPages(req)(3, pageCount, req.query.page)
      });
    })
    .catch((err) => {
      Alert.flash(req, 'Unable to display audits page', err);
      res.render('error');
    });
};

exports.audit = (req, res) => {
  const id = req.params.auditId;
  if (!id) {
    return res.redirect(process.env.BASE_PATH + 'audits');
  }

  Audit.findOne({ '_id': id }).exec()
    .then((audit) => {
      let data = {
        title: 'Audit Details',
        message: audit.message,
        stack: audit.stack
      };

      if (audit.sessionId && audit.sessionId != "") {
        data.sessionId = audit.sessionId;
      }

      if (audit.eventJson && audit.eventJson != "") {
        data.eventJson = audit.eventJson;
      }

      res.render('audit', data);
    })
    .catch((err) => {
      Alert.flash(req, 'Unable to display audit page', err);
      res.redirect(process.env.BASE_PATH + 'audits');
    });
};

exports.clear = (req, res) => {
  Audit.remove({}).then(() => {
    return res.redirect(process.env.BASE_PATH + 'audits');
  }).catch((err) => {
    Alert.flash(req, 'Unable to delete audits', err);
    res.redirect(process.env.BASE_PATH + 'audits');
  });
};
