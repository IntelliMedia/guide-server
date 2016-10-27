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

studentSchema.methods.conceptState = function (id) {
  var conceptState = null;
  var coneptStatesLength = this.conceptStates.length;
  for (var i = 0; i < coneptStatesLength; i++) {
    if (this.conceptStates[i].id == id) {
       conceptState = this.conceptStates[i];
       break;
    }
  }   
  if (conceptState == null) {
    conceptState = {
      id: id,
      value: 0
    };
    this.conceptStates.push(conceptState);
    conceptState = this.conceptStates[this.conceptStates.length-1];
  }
  return conceptState;
};

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
