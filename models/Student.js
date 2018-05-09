const mongoose = require('mongoose');
const StudentModel = require('./StudentModel');
const TutorAction = require('./TutorAction');

const studentSchema = new mongoose.Schema({
  id: String,
  classId: String,
  groupId: String,
  learnPortalEndpoint: String,
  lastSignIn: Date,
  totalSessions: { type: Number, default: 0 },
  studentModel: { type: StudentModel.schema, default: StudentModel.schema},
  tutorActionHistory: [TutorAction.schema]
}, { timestamps: true });

studentSchema.statics.findOrCreate = function(studentId) {
  return Student.findOne({ 'id': studentId }).exec().then((student) => {
    // Found
    if (student) {
      return student;
    } else {
      // Create
      let newStudent = new Student({
        id: studentId});

      return newStudent.save();
    }
  });
}

studentSchema.methods.reset = function() {
  let studentId = this.id;
  return this.studentModel.remove().then(() => {
    return this.remove();
  }).then(() => {
    return Student.findOrCreate(studentId);
  });
}

studentSchema.methods.mostRecentAction = function(action, challengeId, attribute) {
  for (var i = 0; i < this.tutorActionHistory.length; ++i) {
    var tutorAction = this.tutorActionHistory[i];
    if (tutorAction.action === action) {
      if (challengeId && tutorAction.context.challengeId != challengeId) {
        break;
      }
      if (!attribute ||  tutorAction.context.attribute == attribute) {
        return tutorAction;
      }
    }
  }

  return null;
}

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
