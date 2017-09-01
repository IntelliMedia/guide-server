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

exports.createOrFind = (studentId) => {
    return Student.findOne({ 'id': studentId }).populate('studentModel').exec().then((student) => {

      if (!student) {
        student = Student.create(studentId);
      }

      return student.save();
  });
};

exports.updateSessionInfo = (studentId, timestamp) => {
  return new Promise((resolve, reject) => {
    Student.findOne({ 'id': studentId }, (err, student) => {
      if (err) {
        reject(err);
      }

      if (!student) {
        student = Student.create(studentId);
      }

      student.lastSignIn = new Date(timestamp);
      student.totalSessions += 1;
      resolve(Student.save(student));
    });
  });
};

exports.modify = (req, res) => {
  if (req.body.action == 'deleteAll') {
    console.info("Delete all students.");
    Student.remove({}, (err) => {
      return res.redirect('/students');
    });
  }
};
