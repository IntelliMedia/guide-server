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

  Student.findOne({ 'id': studentId }).exec()
    .then((student) => {
      
      res.render('hints', {
        title: 'Hints',
        student: student,
        hintHistory: student.studentModel.hintHistory
      });
    })
    .catch((err) => {
      consolex.exception(err);
      req.flash('errors', { msg: 'Unable to load student. ' + err.toString()});
      return res.send({redirect: '/students'});
    });
};
