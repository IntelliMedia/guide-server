const mongoose = require('mongoose');

const conceptStateSchema = new mongoose.Schema({
  id: String,
  value: Number
});

const characteristicSchema = new mongoose.Schema({
  name: String,
  concepts: [conceptStateSchema]
});

const studentSchema = new mongoose.Schema({
  id: String,
  lastSignIn: Date,
  totalSessions: Number,
  characteristics: [characteristicSchema]
}, { timestamps: true });

studentSchema.methods.conceptState = function (characteristicName, conceptId) {
  var characteristic = null;
  var conceptState = null;

  // Finding existing conceptState
  for (let ccm of this.characteristics) {
    if (ccm.name == characteristicName) {
       for (let concept of ccm.concepts) {
          if (concept.id = conceptId) {
            characteristic = ccm;
            conceptState = concept;
            break;
          }
       }
    }
  }   

  // Add new characteristic, if it doesn't already exist
  if (characteristic == null) {
    characteristic = {
      name: characteristicName,
      concepts: []
    };
    this.characteristics.push(characteristic);
    characteristic = this.characteristics[this.characteristics.length-1];
  }

  // Add new concept, if it doesn't already exist
  if (conceptState == null) {
    conceptState = {
      id: conceptId,
      value: 0
    };
    characteristic.concepts.push(conceptState);
    conceptState = characteristic.concepts[characteristic.concepts.length-1];
  }
  
  return conceptState;
};

studentSchema.methods.resetAllHintLevels = function () {
  var coneptStatesLength = this.conceptStates.length;
  for (var i = 0; i < coneptStatesLength; i++) {
    this.conceptStates[i].hintLevel = -1;
  }   
};

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
