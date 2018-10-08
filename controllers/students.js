const Student = require('../models/Student');
const moment = require('moment');

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

exports.modify = (req, res) => {
  if (req.body.action == 'deleteAll') {
    console.info("Delete all students.");
    Student.remove({}).then(() => {
      return res.redirect(process.env.BASE_PATH + 'students');
    })
    .catch((err) => {
      console.error(err);
      req.flash('errors', { msg: 'Unable to delete student. ' + err.toString()});
      return res.redirect(process.env.BASE_PATH + 'students');
    });
  }
};
