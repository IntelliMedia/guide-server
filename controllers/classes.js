const Class = require('../models/Class');
const moment = require('moment');
const paginate = require('express-paginate');
const MongoQS = require('mongo-querystring');

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
      console.error(err);
      req.flash('errors', { msg: err.toString() });
      res.redirect('back');
    });
};

function filterArray(array, targetObj) {
  return array.filter((item) => {
    return Object.keys(targetObj).every(e => targetObj[e] == item[e]);
  });
}

exports.modify = (req, res) => {
  // Add new group
  if (req.body.action == 'addNew') {
    console.info("Add new group.");
    let group = new Group({ name: "New Group"});
    group.save().then((group) => {
      return res.redirect(process.env.BASE_PATH + 'class/' + group._id);
    })
    .catch((err) => {
      console.error(err);
      req.flash('errors', { msg: err.toString() });
      res.redirect('back');
    });
  }
  // Delete all groups
  else if (req.body.action == 'deleteAll') {
    console.info("Delete all groups.");
    Group.remove({}).then(() => {
        return res.redirect(process.env.BASE_PATH + 'classes');
      })
      .catch((err) => {
        console.error(err);
        req.flash('errors', { msg: err.toString() });
        res.redirect('back');
      });
  }
};
