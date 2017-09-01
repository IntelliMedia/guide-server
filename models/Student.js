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

var autoPopulateStudentModel = function(next) {
  this.populate('studentModel');
  next();
};

studentSchema.pre('findOne', autoPopulateStudentModel);
studentSchema.pre('find', autoPopulateStudentModel);

studentSchema.statics.create = function(studentId) {
  let student = new Student({
    id: studentId,
    totalSessions: 0,
    studentModel: StudentModel.create()
  });

  return student;
}

studentSchema.methods.saveAll = function() {
  return this.studentModel.save().then(() => {
    return this.save();
  });
}

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
