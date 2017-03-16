const mongoose = require('mongoose');

const conceptStateSchema = new mongoose.Schema({
  characteristic: String,
  id: String,
  value: Number
});

const studentSchema = new mongoose.Schema({
  id: String,
  lastSignIn: Date,
  totalSessions: Number,
  concepts: [conceptStateSchema]
}, { timestamps: true });

studentSchema.methods.conceptState = function (characteristicName, conceptId) {
  var conceptState = null;

  // Finding existing conceptState
  for (let concept of this.concepts) {
    if (concept.characteristic == characteristicName
      && concept.id == conceptId) {
      conceptState = concept;
      break;
    }
  }   

  // Add new concept, if it doesn't already exist
  if (conceptState == null) {
    conceptState = {
      characteristic: characteristicName,
      id: conceptId,
      value: 0
    };
    this.concepts.push(conceptState);
    conceptState = this.concepts[this.concepts.length-1];
  }
  
  return conceptState;
};

studentSchema.methods.sortedConceptStatesByValue = function () {
  return this.concepts.sort(function(a, b) {
    if (a.value < b.value) {
      return -1;
    }
    if (a.value > b.value) {
      return 1;
    }
    return 0;
  });
}

studentSchema.methods.resetAllHintLevels = function () {
  var coneptStatesLength = this.conceptStates.length;
  for (var i = 0; i < coneptStatesLength; i++) {
    this.conceptStates[i].hintLevel = -1;
  }   
};

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
