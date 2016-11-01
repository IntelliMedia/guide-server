const Student = require('../models/Student');

/**
 * GET /
 * Session page.
 */
exports.index = (req, res) => {
  const studentId = req.params.studentId;
  if (!studentId) {
    return res.redirect('/students');
  }

  Student.findOne({ 'id': studentId }, (err, student) => {
    if (err) { return next(err); }

    res.render('student', {
      title: 'Student',
      student: student
    });
  })
  .catch((err) => {
    consolex.exception(err);
    req.flash('errors', { msg: 'Student with ID is not found: ' + studentId});
    return res.redirect('/students');
  });
};