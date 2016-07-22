const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  id: String,
  lastSignIn: Date,
  totalSessions: Number
}, { timestamps: true });

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
