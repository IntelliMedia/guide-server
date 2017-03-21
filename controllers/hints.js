const Student = require('../models/Student');
const moment = require('moment');

/**
 * GET /
 * Students page.
 */
exports.index = (req, res) => {
  const studentId = req.params.studentId;
  if (!studentId) {
    return res.redirect('/students');
  }

  Student.findOne({ 'id': studentId }, (err, student) => {
    if (err) { return next(err); }

    res.render('hints', {
      title: 'Hints',
      student: student,
      hintHistory: student.hintHistory
    });
  });
};
