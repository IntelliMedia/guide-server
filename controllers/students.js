const Student = require('../models/Student');
const moment = require('moment');
const studentController = require('../controllers/student');
const datex = require('../utilities/datex');

/**
 * GET /
 * Students page.
 */
exports.index = (req, res) => {
  let filter = {};
  let subtitle;
  if (req.query.classId) {
    filter = {'classId': req.query.classId};
    subtitle = `Class: ${req.query.classId}`;
  }

  Student.find(filter).exec()
    .then((students) => {
      res.render('students', {
        title: 'Students',
        subtitle: subtitle,
        filter: JSON.stringify(filter),
        students: students.sort(compareId)
      })
    })
    .catch((err) => {
      console.error(err);
      req.flash('errors', { msg: 'Unable to load students. ' + err.toString()});
      return res.redirect(process.env.BASE_PATH + 'home');
    });
};

function compareId(a,b) {
  if (a.id < b.id)
    return -1;
  if (a.id > b.id)
    return 1;
  return 0;
}

function trimClassId(classId) {
  return classId.substr(classId.lastIndexOf('/') + 1);
}

exports.post = (req, res) => {
  if (req.body.action == 'download') {
    let filename = 'GuideExport-' + (new Date()).toFilename();
    let filter = req.body.filter ? JSON.parse(req.body.filter) : {};
    if (filter.hasOwnProperty('classId')) {
      filename = 'GuideExport-Class-' + trimClassId(filter.classId);
    }
    studentController.downloadData(filter, filename, res)
      .catch((err) => {
        req.flash('errors', { msg: "Unable to download student data. " + err.toString()});
        res.redirect('back');
      });
  }
};

exports.delete = (req, res) => {
  if (req.body.action == 'delete') {
    let filter = req.body.filter ? JSON.parse(req.body.filter) : {};
    console.info("Delete students -> filter: " + JSON.stringify(filter, null, 2));
    Student.remove(filter).then(() => {
      return res.redirect(process.env.BASE_PATH + 'students');
    })
    .catch((err) => {
      console.error(err);
      req.flash('errors', { msg: 'Unable to delete student. ' + err.toString()});
      return res.redirect(process.env.BASE_PATH + 'students');
    });
  }
};
