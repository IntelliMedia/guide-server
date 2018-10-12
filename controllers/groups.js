const Group = require('../models/Group');
const moment = require('moment');
const paginate = require('express-paginate');
const MongoQS = require('mongo-querystring');
const Audit = require('../models/Audit');
const Alert = require('../models/Alert');

/**
 * GET /
 * Groups page.
 */
exports.index = (req, res) => {
  var qs = new MongoQS();
  let filter = qs.parse(req.query);

  let itemCount = 0;
  Group.count(filter)
    .then((resultsCount) => {
        itemCount = resultsCount;
        return Group.find(filter).sort({name: 1}).limit(req.query.limit).skip(req.skip).lean().exec();
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
      Alert.flash(req, 'Unable to display groups page', err);
      res.render('error');
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
    Audit.record(req.user.email, 'added', 'group');
    group.save().then((group) => {
      return res.redirect(process.env.BASE_PATH + 'group/' + group._id);
    })
    .catch((err) => {
      Alert.flash(req, 'Unable to add new group', err);
      res.redirect('back');
    });
  }
  // Delete all groups
  else if (req.body.action == 'deleteAll') {
    console.info("Delete all groups.");
    Audit.record(req.user.email, 'deleted', 'all groups');
    Group.remove({}).then(() => {
        return res.redirect(process.env.BASE_PATH + 'groups');
      })
      .catch((err) => {
        Alert.flash(req, 'Unable to delete groups', err);
        res.redirect('back');
      });
  }
};
