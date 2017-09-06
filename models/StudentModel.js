const mongoose = require('mongoose');
const _ = require('lodash');

const hintDeliveredSchema = new mongoose.Schema({
  conceptId: String,
  normalizedScore: Number,
  challengeId: String,
  ruleCriteria: String, 
  ruleSelected: String,
  hintLevel: Number,
  timestamp: Date
}, { _id : false });

const conceptStateSchema = new mongoose.Schema({
  conceptId: { type: String, required: true},
  normalizedScore: { type: Number, default: 0},
  totalCorrect: { type: Number, default: 0},
  totalAttempts: { type: Number, default: 0},
  totalHintsDelivered:{ type: Number, default: 0}
}, { _id : false });
const ConceptState = mongoose.model('ConceptState', conceptStateSchema);

const conceptsByKeySchema = new mongoose.Schema({
  key: String,
  concepts: [conceptStateSchema]
}, { _id : false });

const scoreSnapshotSchema = new mongoose.Schema({
  normalizedScore: Number,
  totalCorrect: Number,
  totalAttempts: Number,
  timestamp: Date
}, { _id : false });

const snapshotsByConceptIdSchema = new mongoose.Schema({
  conceptId: String,
  snapshots: [scoreSnapshotSchema]
}, { _id : false });

const studentModelSchema = new mongoose.Schema({
  concepts: [conceptStateSchema],
  conceptsByChallenge: [conceptsByKeySchema],
  conceptsByTrait: [conceptsByKeySchema],
  hintHistory: [hintDeliveredSchema],
  conceptsOverTime: [snapshotsByConceptIdSchema]
}, { timestamps: true });

studentModelSchema.methods.reset = function() {
  this.concepts = [];
  this.conceptsByChallenge = [];
  this.conceptsByTrait = [];
  this.hintHistory = [];
  this.conceptsOverTime = [];
}

studentModelSchema.methods.findAggregate = function(conceptId) {
  let conceptState = this.concepts.find((c) => c.conceptId === conceptId);
  if (!conceptState) {
    this.concepts.push(new ConceptState({
      conceptId: conceptId }));
    conceptState = this.concepts[0];
  }
  
  return conceptState;
};

studentModelSchema.methods.updateAggregate = function(conceptId, isCorrect) {
  var conceptState = this.conceptState(criteria, conceptId);
  // Add new concept, if it doesn't already exist
  if (conceptState == null) {
    conceptState = {
      criteria: criteria,
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

studentModelSchema.methods.averageScaledScore = function () {

  // Finding existing conceptState
  var correct = 0;
  var total = 0; 
  for (let concept of this.concepts) {
    correct += concept.totalCorrect;
    total += (concept.totalCorrect + concept.totalIncorrect);
  }   
  
  return  (total != 0 ? correct/total : 0);
}

studentModelSchema.methods.conceptScaledScore = function (criteria, conceptId) {
  var conceptState = this.conceptState(criteria, conceptId);
  if (!conceptState) {
    return undefined;
  }

  var total = (conceptState.totalCorrect + conceptState.totalIncorrect);
  return  (total != 0 ? conceptState.totalCorrect/total : 0);
}

studentModelSchema.methods.conceptScoreInfo = function (criteria, conceptId) {
  var conceptState = this.conceptState(criteria, conceptId);
  if (!conceptState) {
    return undefined;
  }

  var total = (conceptState.totalCorrect + conceptState.totalIncorrect);
  return {
     scaledScore: (total != 0 ? conceptState.totalCorrect/total : 0),
     correct: conceptState.totalCorrect,
     total: total
  };
}

studentModelSchema.methods.conceptState = function (criteria, conceptId) {
  var conceptState = null;

  // Finding existing conceptState
  for (let concept of this.concepts) {
    if (concept.criteria == criteria
      && concept.id == conceptId) {
      conceptState = concept;
      break;
    }
  }   
  
  return conceptState;
};

studentModelSchema.methods.modelConceptIds = function () {
  return _.uniq(this.concepts.map(function(a) {return a.id;})).sort();
}

studentModelSchema.methods.modelCriteria = function () {
  return _.uniq(this.concepts.map(function(a) {return a.criteria;})).sort();
}

studentModelSchema.methods.addHintToHistory = function(conceptId, scaledScore, challengeId, ruleCriteria, ruleSelected, hintLevel) {
  var hintDelivered = {
    conceptId: conceptId,
    scaledScore: scaledScore,
    challengeId: challengeId,
    ruleCriteria: ruleCriteria,
    ruleSelected: ruleSelected,
    hintLevel: hintLevel,
    timestamp: new Date()
  }
  this.hintHistory.push(hintDelivered);

  return hintDelivered;
}

studentModelSchema.methods.mostRecentHint = function(challengeId) {
  for (var i = this.hintHistory.length-1; i >= 0; --i) {
    var hintDelivered = this.hintHistory[i];
    if (hintDelivered.challengeId == challengeId) {
      return hintDelivered;
    }
  }

  return null;
}

studentModelSchema.methods.currentHintLevel = function (challengeId, target, selected) {
  var hintLevel = 0;
  for (var i = 0; i < this.hintHistory.length; ++i) {
    var previousHint = this.hintHistory[i];
    if (previousHint.challengeId == challengeId
      && previousHint.ruleCriteria == target
      && previousHint.ruleSelected == selected) {
        hintLevel = Math.max(hintLevel, previousHint.hintLevel);
      }
  }

  return hintLevel;
}

const StudentModel = mongoose.model('StudentModel', studentModelSchema);

module.exports = StudentModel;
