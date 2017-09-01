const Group = require('../models/Group');
const moment = require('moment');

/**
 * GET /
 * Groups page.
 */
exports.index = (req, res) => {
  Group.find({}, (err, groups) => {
    res.render('groups', {
      title: 'Groups',
      groups: groups.sort(compareName)
    });
  });
};

function compareName(a,b) {
  if (a.name < b.name)
    return -1;
  if (a.name > b.name)
    return 1;
  return 0;
}

exports.create = (name) => {
  return new Promise((resolve, reject) => {
      group = Group.create(name);

      group.save((err) => {
        if (err) {
          reject(err);
        } else {
          resolve(group);
        }
      });
    });
};

exports.modify = (req, res) => {
  if (req.body.action == 'addNew') {
    console.info("Add new group.");
    exports.create("New Group").then((group) => {
      return res.redirect('/group/' + group._id);
    });
  }
  else if (req.body.action == 'deleteAll') {
    console.info("Delete all groups.");
    Group.remove({}, (err) => {
      return res.redirect('/groups');
    });
  }
};
