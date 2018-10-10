const Student = require('../models/Student');
const Session = require('../models/Session');
const ConceptObservation = require('../models/ConceptObservation');
const Concept = require('../models/Concept');
const StudentDataExporter = require('../services/studentDataExporter');

/**
 * GET /
 * Student page.
 */
exports.index = (req, res) => {
  const studentId = req.params.studentId;
  if (!studentId) {
    return res.redirect(process.env.BASE_PATH + 'students');
  }

  Student.findOne({ 'id': studentId }).exec()
    .then((student) => {
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
    .catch((err) => {
      console.error(err);
      req.flash('errors', { msg: 'Unable to load student. ' + err.toString()});
      return res.redirect(process.env.BASE_PATH + 'students');
    });
};

exports.post = (req, res) => {
  if (req.body.action == 'download') {
    let filename = 'GuideExport-' + req.body.studentId;
    var filter = { 'id': req.body.studentId};
    exports.downloadData(filter, filename, res)
      .catch((err) => {
        req.flash('errors', { msg: 'Unable to download data. ' + err.toString()});
        res.redirect('back');
      });
  } else if (req.body.action == 'reset') {
    var studentId = req.body.studentId;
    exports.resetStudentModel(studentId)
      .then(() => {
        res.redirect('back');
      })
      .catch((err) => {
        req.flash('errors', { msg: 'Unable to reset student. ' + err.toString()});
        res.redirect('back');
      });
  }
}

exports.delete = (req, res) => {
  if (req.body.studentId) {
    var studentId = req.body.studentId;
    exports.deleteStudent(studentId)
      .then(() => {
        res.redirect(process.env.BASE_PATH + 'students');
      })
      .catch((err) => {
        req.flash('errors', { msg: 'Unable to delete student. ' + err.toString()});
        res.redirect('back');
      });
  }
}

exports.resetStudentModel = (studentId) => {
  console.info("Reset student model: " + studentId);
  return Student.findOne({ 'id': studentId }).exec()
    .then((student) => {
      console.info("Save student: " + studentId);
      return student.reset();
    })
    .catch((err) => {
      console.error(err);
    });
}

exports.downloadData = (studentFilter, filename, response) => {
  console.info("Download student data -> filter: " + JSON.stringify(studentFilter, null, 2));
  let exporter;
  return Student.find(studentFilter).exec()
    .then((students) => {
      exporter = new StudentDataExporter(filename, response);
      return exporter.add(students);
    })
    .then(() => {
      return exporter.finalize();
    })
    .catch((err) => {
      console.error(err);
    });
}

exports.deleteStudent = (studentId) => {
  console.info("Delete student: " + studentId);
  return Student.deleteMany({ 'id': studentId }).exec()
    .then(() => {
      console.info("Delete sessions for student: " + studentId);
      return Session.deleteMany({ 'studentId': studentId }).exec();
    })
    .then(() => {
      console.info("Delete observations for student: " + studentId);
      return ConceptObservation.deleteMany({ 'studentId': studentId }).exec();
    })
    .catch((err) => {
      console.error(err);
    });
}