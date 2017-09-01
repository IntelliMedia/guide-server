const Student = require('../models/Student');
const moment = require('moment');

/**
 * GET /
 * Students page.
 */
exports.index = (req, res) => {
  Student.find({}, (err, students) => {
    res.render('students', {
      title: 'Students',
      students: students.sort(compareId)
    });
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
    Student.remove({}, (err) => {
      return res.redirect('/students');
    });
  }
};
