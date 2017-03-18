const mongoose = require('mongoose');

const conceptStateSchema = new mongoose.Schema({
  characteristic: String,
  id: String,
  score: Number
});

const hintDelivered = new mongoose.Schema({
  conceptId: String,
  conceptScore: String,
  challengeId: String,
  ruleTarget: String, 
  ruleSelected: String,
  hintLevel: Number,
  timestamp: Date
}, { timestamps: true });

const studentSchema = new mongoose.Schema({
  id: String,
  lastSignIn: Date,
  totalSessions: Number,
  concepts: [conceptStateSchema],
  hintHistory: [hintDelivered]
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
      score: 0
    };
    this.concepts.push(conceptState);
    conceptState = this.concepts[this.concepts.length-1];
  }
  
  return conceptState;
};

studentSchema.methods.sortedConceptStatesByScore = function () {
  return this.concepts.sort(function(a, b) {
    if (a.score < b.score) {
      return -1;
    }
    if (a.score > b.score) {
      return 1;
    }
    return 0;
  });
}

studentSchema.methods.addHintToHistory = function (conceptId, conceptScore, challengeId, ruleTarget, ruleSelected, hintLevel) {
  var hintDelivered = {
    conceptId: conceptId,
    conceptScore: conceptScore,
    challengeId: challengeId,
    ruleTarget: ruleTarget,
    ruleSelected: ruleSelected,
    hintLevel: hintLevel,
    timestamp: new Date()
  }
  this.hintHistory.push(hintDelivered);

  return hintDelivered;
}

studentSchema.methods.mostRecentHint = function(challengeId) {
  for (var i = this.hintHistory.length-1; i >= 0; --i) {
    var hintDelivered = this.hintHistory[i];
    if (hintDelivered.challengeId == challengeId) {
      return hintDelivered;
    }
  }

  return null;
}

studentSchema.methods.currentHintLevel = function (challengeId, target, selected) {
  var hintLevel = 0;
  for (var i = 0; i < this.hintHistory.length; ++i) {
    var previousHint = this.hintHistory[i];
    if (previousHint.challengeId == challengeId
      && previousHint.ruleTarget == target
      && previousHint.ruleSelected == selected) {
        hintLevel = Math.max(hintLevel, previousHint.hintLevel);
      }
  }

  return hintLevel;
}

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
