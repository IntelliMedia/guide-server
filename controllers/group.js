const Group = require('../models/Group');
const Concept = require('../models/Concept');
const FileRepository = require('../storage/fileRepository');
const CsvDeserializer = require('../storage/csvDeserializer');
const Audit = require('../models/Audit');
const Alert = require('../models/Alert');

/**
 * GET /
 * Session page.
 */
exports.index = (req, res) => {
  const groupId = req.params.groupId;
  if (!groupId) {
    return res.redirect(process.env.BASE_PATH + 'groups');
  }

  Group.findOne({ '_id': groupId }).exec()
    .then((group) => {
      res.render('group', {
        title: 'Group',
        group: group
      });
    })
    .catch((err) => {
      Alert.flash(req, 'Unable to display group page', err);
      res.render('error');
    });
};

exports.delete = (req, res) => {
  const groupId = req.params.groupId;
  if (!groupId) {
    return res.redirect(process.env.BASE_PATH + 'groups');
  }

  Audit.record(req.user.email, 'deleted', 'group', groupId);
  Group.remove({ '_id': groupId }).exec()
    .then(() => {
      return res.send({redirect: './groups'});
    })
    .catch((err) => {
      Alert.flash(req, 'Unable to delete group', err);
      res.redirect(process.env.BASE_PATH + 'groups');
    });
};

exports.duplicate = (req, res) => {
  if (req.body.hasOwnProperty("id")) {
    var modifiedGroup = req.body;
    console.info("Duplicate group: " + modifiedGroup.id);
    Audit.record(req.user.email, 'duplicated', 'group', `${modifiedGroup.name} (${modifiedGroup.id})`);
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
        return res.send({redirect: './group/' + duplicateGroup.id});
      })
      .catch((err) => {
        Alert.flash(req, 'Unable to duplicate group', err);
        res.redirect(process.env.BASE_PATH + 'groups');
      });
  }
}

exports.modify = (req, res) => {
  if (req.body.hasOwnProperty("id")) {
    var modifiedGroup = req.body;
    console.info("Update group: " + modifiedGroup.id);
    Audit.record(req.user.email, 'updated', 'group', `${modifiedGroup.name} (${modifiedGroup.id})`);
    Group.findOne({ '_id': modifiedGroup.id }).exec()
    .then((group) => {
      group.replace(modifiedGroup);
      return group.save();
    })
    .then(() => {
      return res.send({redirect: './groups'});
    })
    .catch((err) => {
      Alert.flash(req, 'Unable to update group', err);
      res.redirect('./group/' + modifiedGroup.id);
    });
  }
};

exports.clearCache = (req, res) => {
  if (req.body.hasOwnProperty("id")) {
    var group = req.body;
    console.info("Clear local file cache for group: " + group.id);
    try {
      Audit.record(req.user.email, 'cleared', 'group configuration cache');
      let cacheRepository = new FileRepository(global.cacheDirectory, new CsvDeserializer());
      for (let id of group.repositoryLinks.map((c) => { return c.googleSheetDocId; })) {
        cacheRepository.deleteCollection(id);
      }

      req.flash('info',  { msg: 'Cache successfully cleared'});
      return res.send({redirect: './group/' + group.id});
    } catch(e) {
      Alert.flash(req, 'Unable to clear configuration cache', err);
      res.redirect('./group/' + group.id);
    }
  }
};