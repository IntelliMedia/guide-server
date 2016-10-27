const mongoose = require('mongoose');

const conceptStateSchema = new mongoose.Schema({
  id: String,
  value: Number,
});

const studentSchema = new mongoose.Schema({
  id: String,
  lastSignIn: Date,
  totalSessions: Number,
  conceptStates: [conceptStateSchema]
}, { timestamps: true });

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
