const Class = require('../models/Class');
const moment = require('moment');
const paginate = require('express-paginate');
const MongoQS = require('mongo-querystring');
const Alert = require('../models/Alert');

/**
 * GET /
 * Groups page.
 */
exports.index = (req, res) => {
  var qs = new MongoQS();
  let filter = qs.parse(req.query);

  Class.allClasses()
    .then((classes) => {
      classes = filterArray(classes, filter);
      let itemCount = classes.length;
      let classesOnPage = classes.splice(req.skip, req.query.limit);
      const pageCount = Math.ceil(itemCount / req.query.limit);

      res.render('classes', {
        title: 'Classes',
        classes: classesOnPage,
        pageCount,
        itemCount,
        pages: paginate.getArrayPages(req)(3, pageCount, req.query.page)
      });
    })
    .catch((err) => {
      Alert.flash(req, 'Unable to display classes page', err);
      res.render('error');
    });
};

function filterArray(array, targetObj) {
  return array.filter((item) => {
    return Object.keys(targetObj).every(e => targetObj[e] == item[e]);
  });
}
