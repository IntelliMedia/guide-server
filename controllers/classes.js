const Class = require('../models/Class');
const moment = require('moment');
const paginate = require('express-paginate');

/**
 * GET /
 * Groups page.
 */
exports.index = (req, res) => {
  Class.allClasses()
    .then((classes) => {
      let itemCount = classes.length;
      let classesOnPage = classes.sort(compareId).splice(req.skip, req.query.limit);
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
      return res.redirect(process.env.BASE_PATH + '');
    });
};

function compareId(a,b) {
  if (a.id < b.id)
    return -1;
  if (a.id > b.id)
    return 1;
  return 0;
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
      return res.redirect(process.env.BASE_PATH + 'classes');
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
        return res.redirect(process.env.BASE_PATH + 'classes');
      });
  }
};
