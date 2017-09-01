const mongoose = require('mongoose');
const StudentModel = require('./StudentModel');

const studentSchema = new mongoose.Schema({
  id: String,
  classId: String,
  groupId: String,
  lastSignIn: Date,
  totalSessions: Number,
  studentModel: { type: mongoose.Schema.Types.ObjectId, ref: "StudentModel" }
}, { timestamps: true });

studentSchema.statics.create = function(studentId) {
  let student = new Student({
    id: studentId,
    totalSessions: 0,
    studentModel: StudentModel.create()
  });

  return student;
}

studentSchema.statics.save = function(student) {
  return student.studentModel.save().then(() => {
    return student.save();
  });
}

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
