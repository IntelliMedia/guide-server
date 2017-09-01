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

  Group.findOne({ '_id': groupId }, (err, group) => {
    if (err) { return next(err); }
    res.render('group', {
      title: 'Group',
      group: group
    });
  })
  .exec()
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

  Group.remove({ 'id': groupId }, (err) => {
    if (err) { return next(err); }  
    return res.send({redirect: '/groups'});
  })
  .exec()
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
    Group.findOne({ '_id': modifiedGroup.id }, (err, group) => {
      if (err) { 
        return next(err); 
      }
      console.info("Update group: " + group._id);
      group.replace(modifiedGroup);
      group.save((err) => {
        if (err) {
          return next(err);
        } else {
          var duplicateGroup = group.clone();
          duplicateGroup.save((err) => {
            if (err) {
              return next(err);
            } else {
              return res.send({redirect: '/group/' + duplicateGroup.id});
            }
          });
        }
      });
    })
    .exec()
    .catch((err) => {
      consolex.exception(err);
      req.flash('errors', { msg: 'Group with ID is not found: ' + groupId});
      return res.send({redirect: '/groups'});
    });
  }
}

exports.modify = (req, res) => {
  if (req.body.hasOwnProperty("id")) {
    var modifiedGroup = req.body;
    console.info("Update group: " + modifiedGroup.id);
    Group.findOne({ '_id': modifiedGroup.id }, (err, group) => {
      if (err) { return next(err); }

      group.replace(modifiedGroup);

      group.save((err) => {
        if (err) {
          next(err);
        } else {
          return res.send({redirect: '/groups'});
        }
      });
    })
    .exec()
    .catch((err) => {
      consolex.exception(err);
      req.flash('errors', { msg: 'Group with ID is not found: ' + groupId});
      return res.send({redirect: '/groups'});
    });
  }
};