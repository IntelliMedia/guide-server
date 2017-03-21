const mongoose = require('mongoose');
const _ = require('lodash');

const conceptStateSchema = new mongoose.Schema({
  characteristic: String,
  id: String,
  sumScore: Number,
  totalCorrect: Number,
  totalIncorrect: Number,
  totalNeutral: Number
});

const hintDelivered = new mongoose.Schema({
  conceptId: String,
  scaledScore: String,
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

studentSchema.methods.updateConceptState = function (characteristicName, conceptId, adjustment) {
  var conceptState = this.conceptState(characteristicName, conceptId);
  // Add new concept, if it doesn't already exist
  if (conceptState == null) {
    conceptState = {
      characteristic: characteristicName,
      id: conceptId,
      scaledScore: 0,
      sumScore: 0,
      totalCorrect: 0,
      totalIncorrect: 0,
      totalNeutral: 0
    };
    this.concepts.push(conceptState);
    conceptState = this.concepts[this.concepts.length-1];
  }

  conceptState.sumScore += adjustment;
  if (adjustment > 0) {
    conceptState.totalCorrect += 1;
  } else if (adjustment < 0) {
    conceptState.totalIncorrect += 1;
  } else {
    conceptState.totalNeutral += 1;
  }
}

studentSchema.methods.averageScaledScore = function () {

  // Finding existing conceptState
  var correct = 0;
  var total = 0; 
  for (let concept of this.concepts) {
    correct += concept.totalCorrect;
    total += (concept.totalCorrect + concept.totalIncorrect);
  }   
  
  return  (total != 0 ? correct/total : 0);
}

studentSchema.methods.conceptScaledScore = function (characteristicName, conceptId) {
  var conceptState = this.conceptState(characteristicName, conceptId);
  if (!conceptState) {
    return undefined;
  }

  var total = (conceptState.totalCorrect + conceptState.totalIncorrect);
  return  (total != 0 ? conceptState.totalCorrect/total : 0);
}

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
  
  return conceptState;
};

studentSchema.methods.modelConceptIds = function () {
  return _.uniq(this.concepts.map(function(a) {return a.id;})).sort();
}

studentSchema.methods.modelCharacterisitics = function () {
  return _.uniq(this.concepts.map(function(a) {return a.characteristic;})).sort();
}

studentSchema.methods.addHintToHistory = function (conceptId, scaledScore, challengeId, ruleTarget, ruleSelected, hintLevel) {
  var hintDelivered = {
    conceptId: conceptId,
    scaledScore: scaledScore,
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
