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

studentSchema.statics.findOrCreate = function(studentId) {
  return Student.findOne({ 'id': studentId }).exec().then((student) => {

    // Found
    if (student) {
      // For backward compatibility (GUIDE 1.x)
      if (!(student.studentModel instanceof StudentModel)) {
        student.studentModel = StudentModel.create();
      }
      return student;

    } else {
      // Create
      let newStudent = new Student({
        id: studentId,
        totalSessions: 0,
        studentModel: StudentModel.create()
      });

      return newStudent.saveAll();
    }
  });
}

studentSchema.methods.saveAll = function() {
  return this.studentModel.save().then(() => {
    return this.save();
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

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
