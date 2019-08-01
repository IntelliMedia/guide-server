const Student = require('../models/Student');
const Session = require('../models/Session');
const ConceptObservation = require('../models/ConceptObservation');
const Concept = require('../models/Concept');
const StudentDataExporter = require('../services/studentDataExporter');
const Audit = require('../models/Audit');
const Alert = require('../models/Alert');

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
      Alert.flash(req, 'Unable to display student page', err);
      res.redirect('back');
    });
};

exports.post = (req, res) => {
  if (req.body.action == 'download') {
    let exportName = req.body.studentId;
    var filter = { 'id': req.body.studentId};
    Audit.record(req.user.email, 'downloaded', 'student data', JSON.stringify(filter, null, 2));
    exports.downloadData(filter, exportName, res)
      .catch((err) => {
        Alert.flash(req, 'Unable to download student data', err);
        res.redirect('back');
      });
  } else if (req.body.action == 'reset') {
    var studentId = req.body.studentId;
    exports.resetStudentModel(studentId)
      .then(() => {
        res.redirect('back');
      })
      .catch((err) => {
        Alert.flash(req, 'Unable to reset student model', err);
        res.redirect('back');
      });
  }
}

exports.delete = (req, res) => {
  if (req.body.studentId) {
    var studentId = req.body.studentId;
    Audit.record(req.user.email, 'deleted', 'student', studentId);
    exports.deleteStudent(studentId)
      .then(() => {
        res.redirect(process.env.BASE_PATH + 'students');
      })
      .catch((err) => {
        Alert.flash(req, 'Unable to delete student', err);
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
    });
}

exports.downloadData = (studentFilter, filename, response) => {
  let displayableFilter = JSON.stringify(studentFilter, null, 2).substring(1, 256);
  console.info("Download student data | filter: " + displayableFilter);
  let exporter;
  return Student.find(studentFilter).exec()
    .then((students) => {
      exporter = new StudentDataExporter(filename, response);
      return exporter.add(students);
    })
    .then(() => {
      return exporter.finalize();
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
    });
}