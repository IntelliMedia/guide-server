const Group = require('../models/Group');
const moment = require('moment');
const paginate = require('express-paginate');

/**
 * GET /
 * Groups page.
 */
exports.index = (req, res) => {
  let itemCount = 0;
  Group.count({})
    .then((resultsCount) => {
        itemCount = resultsCount;
        return Group.find({}).limit(req.query.limit).skip(req.skip).lean().exec();
    })
    .then((groups) => {
      const pageCount = Math.ceil(itemCount / req.query.limit);

      res.render('groups', {
        title: 'Groups',
        groups: groups,
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

function compareName(a,b) {
  if (a.name < b.name)
    return -1;
  if (a.name > b.name)
    return 1;
  return 0;
}

exports.modify = (req, res) => {
  // Add new group
  if (req.body.action == 'addNew') {
    console.info("Add new group.");
    let group = new Group({ name: "New Group"});
    group.save().then((group) => {
      return res.redirect(process.env.BASE_PATH + 'group/' + group._id);
    })
    .catch((err) => {
      console.error(err);
      req.flash('errors', { msg: err.toString() });
      return res.redirect(process.env.BASE_PATH + 'groups');
    });
  }
  // Delete all groups
  else if (req.body.action == 'deleteAll') {
    console.info("Delete all groups.");
    Group.remove({}).then(() => {
        return res.redirect(process.env.BASE_PATH + 'groups');
      })
      .catch((err) => {
        console.error(err);
        req.flash('errors', { msg: err.toString() });
        return res.redirect(process.env.BASE_PATH + 'groups');
      });
  }
};
