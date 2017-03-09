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

  Group.findOne({ 'id': groupId }, (err, group) => {
    if (err) { return next(err); }

    res.render('group', {
      title: 'Group',
      group: group,
      concepts: Concept.getAll()
    });
  })
  .exec()
  .catch((err) => {
    consolex.exception(err);
    req.flash('errors', { msg: 'Group with ID is not found: ' + groupId});
    return res.redirect('/groups');
  });
};