const mongoose = require('mongoose');
const StudentModel = require('./StudentModel');

const studentSchema = new mongoose.Schema({
  id: String,
  classId: String,
  groupId: String,
  learnPortalEndpoint: String,
  lastSignIn: Date,
  totalSessions: { type: Number, default: 0 },
  studentModel: { type: StudentModel.schema, default: StudentModel.schema}
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

studentSchema.statics.isTempUser = function(studentId) {
  return (studentId ? studentId.startsWith("TEMP-") : false);
}

studentSchema.methods.reset = function() {
  let studentId = this.id;
  return this.remove().then(() => {
    return Student.findOrCreate(studentId);
  });
}

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
