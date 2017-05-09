const consolex = require('../utilities/consolex');
const Student = require('../models/Student');
const Concept = require('../models/Concept');

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

    if (req.query.view == "json") {
        res.render('json', {
        title: 'Student JSON',
        json: JSON.stringify(student, undefined, 2)
      });
    } else {
      res.render('student', {
        title: 'Student',
        student: student,
        concepts: Concept.getAll()
      });
    }
  })
  .exec()
  .catch((err) => {
    consolex.exception(err);
    req.flash('errors', { msg: 'Student with ID is not found: ' + studentId});
    return res.redirect('/students');
  });
};

exports.reset = (req, res) => {
  if (req.body.studentId) {
    var studentId = req.body.studentId;
    console.info("Reset student model: " + studentId);
    Student.findOne({ 'id': studentId }, (err, student) => {
      if (err) { 
        return next(err); 
      }
      console.info("Save student: " + studentId);
      student.reset();
      student.save((err) => {
        if (err) {
          return next(err);
        } else {
          return res.redirect('/student/' + studentId);
        }
      });
    })
    .exec()
    .catch((err) => {
      consolex.exception(err);
      req.flash('errors', { msg: 'Student with ID is not found: ' + studentId});
      return res.redirect('/students');
    });
  }
}