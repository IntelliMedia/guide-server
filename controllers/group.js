const consolex = require('../utilities/consolex');
const Group = require('../models/Group');
const Concept = require('../models/Concept');

/**
 * GET /
 * Session page.
 */
exports.index = (req, res) => {
  const groupId = req.params.groupId;
  if (!groupId) {
    return res.redirect('/groups');
  }

  Group.findOne({ '_id': groupId }).exec()
    .then((group) => {
      res.render('group', {
        title: 'Group',
        group: group
      });
    })
    .catch((err) => {
      consolex.exception(err);
      req.flash('errors', { msg: 'Group with ID is not found: ' + groupId});
      return res.redirect('/groups');
    });
};

exports.delete = (req, res) => {
  const groupId = req.params.groupId;
  if (!groupId) {
    return res.redirect('/groups');
  }

  Group.remove({ '_id': groupId }).exec()
    .then(() => { 
      return res.send({redirect: '/groups'});
    })
    .catch((err) => {
      consolex.exception(err);
      req.flash('errors', { msg: 'Group with ID is not found: ' + groupId});
      return res.send({redirect: '/groups'});
    });
};

exports.duplicate = (req, res) => {
  if (req.body.hasOwnProperty("id")) {
    var modifiedGroup = req.body;
    console.info("Duplicate group: " + modifiedGroup.id);
    Group.findOne({ '_id': modifiedGroup.id }).exec()
      .then((group) => {
        console.info("Update group: " + group._id);
        group.replace(modifiedGroup);
        return group.save();
      })
      .then((group) => {
        var duplicateGroup = group.clone();
        return duplicateGroup.save();
      })
      .then((duplicateGroup) => {
        return res.send({redirect: '/group/' + duplicateGroup.id});
      })
      .catch((err) => {
        consolex.exception(err);
        req.flash('errors', { msg: 'Unable to duplicate group. ' + err.toString()});
        return res.send({redirect: '/groups'});
      });
  }
}

exports.modify = (req, res) => {
  if (req.body.hasOwnProperty("id")) {
    var modifiedGroup = req.body;
    console.info("Update group: " + modifiedGroup.id);
    Group.findOne({ '_id': modifiedGroup.id }).exec()
    .then((group) => {
      group.replace(modifiedGroup);
      return group.save();
    })
    .then(() => {
      return res.send({redirect: '/groups'});
    })
    .catch((err) => {
      consolex.exception(err);
      req.flash('errors', { msg: 'Unable to update group. ' + err.toString()});
      return next(err);
    });
  }
};