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

exports.updateSessionInfo = (studentId, timestamp) => {
  return new Promise((resolve, reject) => {
    Student.findOne({ 'id': studentId }, (err, student) => {
      if (err) {
        reject(err);
      }

      if (!student) {
        student = new Student();
        student.id = studentId;
        student.totalSessions = 0;
      }

      student.lastSignIn = new Date(timestamp);
      student.totalSessions += 1;
      student.save((err) => {
        if (err) {
          reject(err);
        } else {
          resolve(student);
        }
      });
    });
  });
};
