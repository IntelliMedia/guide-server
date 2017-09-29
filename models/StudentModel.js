const mongoose = require('mongoose');
const _ = require('lodash');

function createConceptStateSchema(additionalField) {
  let schema = new mongoose.Schema({
    conceptId: { type: String, required: true},
    score: { type: Number, default: 0},
    totalCorrect: { type: Number, default: 0},
    totalAttempts: { type: Number, default: 0},
    totalHintsDelivered:{ type: Number, default: 0},
    totalBottomOutHintsDelivered:{ type: Number, default: 0}
  }, { _id : false });

  if (additionalField) {
    schema.add(additionalField);
  }

  return schema;
}

const conceptStateSchema = createConceptStateSchema();
const ConceptState = mongoose.model('ConceptState', conceptStateSchema);

const conceptSnapshotSchema = createConceptStateSchema({timestamp: { type: Date, required: true }});
const ConceptSnapshot = mongoose.model('ConceptSnapshot', conceptSnapshotSchema);

const conceptsByChallengeIdSchema = new mongoose.Schema({
  challengeId: { type: String, required: true},
  concepts: [conceptStateSchema]
}, { _id : false });
const ConceptsByChallengeId = mongoose.model('ConceptsByChallengeId', conceptsByChallengeIdSchema);

const conceptsByTraitSchema = new mongoose.Schema({
  trait: { type: String, required: true},
  concepts: [conceptStateSchema]
}, { _id : false });
const ConceptsByTrait = mongoose.model('ConceptsByTrait', conceptsByTraitSchema);

const snapshotsByConceptIdSchema = new mongoose.Schema({
  conceptId: { type: String, required: true},
  snapshots: [conceptSnapshotSchema]
}, { _id : false });
const SnapshotsByConceptId = mongoose.model('SnapshotsByConceptId', snapshotsByConceptIdSchema);

const hintDeliveredSchema = new mongoose.Schema({
  conceptId: { type: String, required: true},
  scoreByChallenge: { type: Number, default: 0},
  challengeId: String,
  trait: String,
  ruleCriteria: String, 
  ruleSelected: String,
  isBottomOut: { type: Boolean, default: false},
  hintLevel: { type: Number, default: 0},
  timestamp: Date
}, { _id : false });
const HintDelivered = mongoose.model('HintDelivered', hintDeliveredSchema);

const studentModelSchema = new mongoose.Schema({
  conceptsAggregated: [conceptStateSchema],
  conceptsByChallenge: [conceptsByChallengeIdSchema],
  conceptsByTrait: [conceptsByTraitSchema],
  snapshotsByConceptId: [snapshotsByConceptIdSchema],
  hintHistory: [hintDeliveredSchema]
}, { timestamps: true });

studentModelSchema.methods.reset = function() {
  this.conceptsAggregated = [];
  this.conceptsByChallenge = [];
  this.conceptsByTrait = [];
  this.snapshotsByConceptId = [];
  this.hintHistory = [];
}

// Reusable method that is used to find/create ConceptState in a collection
// This method is reused for multiple collections in the StudentModel
studentModelSchema.statics.getConceptState = function(collection, conceptId) {
  let conceptState = collection.find((c) => c.conceptId === conceptId);
  if (!conceptState) {
    collection.unshift(new ConceptState({
      conceptId: conceptId }));

    conceptState = collection[0];
  }
  return conceptState;
}

// Reusable method for finding time-based concept data
studentModelSchema.statics.getConceptSnapshot = function(collection, conceptId, timestamp) {
  let conceptSnapshot = collection.find((c) => c.conceptId === conceptId && c.timestamp === timestamp);
  if (!conceptSnapshot) {
    collection.unshift(new ConceptSnapshot({
      conceptId: conceptId,
      timestamp: timestamp}));

    conceptSnapshot = collection[0];
  }
  return conceptSnapshot;
}

studentModelSchema.methods.getOverallScore = function() {
  if (!this.conceptsAggregated || this.conceptsAggregated.length == 0) {
    return 0;
  }

  let score = 0;
  this.conceptsAggregated.forEach((c) => score += c.score);

  score = score / this.conceptsAggregated.length;

  return score;
};

studentModelSchema.methods.getConceptAggregated = function(conceptId) {
  return StudentModel.getConceptState(this.conceptsAggregated, conceptId);
};

studentModelSchema.methods.getConceptByChallenge = function(conceptId, challengeId) {
  // Get concept collection by challenge
  let conceptsByChallenge = this.conceptsByChallenge.find((c) => c.challengeId === challengeId);
  if (!conceptsByChallenge) {
    // Create new concept collection for this challenge
    this.conceptsByChallenge.unshift(new ConceptsByChallengeId({
      challengeId: challengeId }));

    conceptsByChallenge = this.conceptsByChallenge[0];
  }

  return StudentModel.getConceptState(conceptsByChallenge.concepts, conceptId);
};

studentModelSchema.methods.getConceptByTrait = function(conceptId, trait) {
  // Get concept collection by challenge
  let conceptsByTrait = this.conceptsByTrait.find((c) => c.trait === trait);
  if (!conceptsByTrait) {
    // Create new concept collection for this challenge
    this.conceptsByTrait.unshift(new ConceptsByTrait({
      trait: trait }));

    conceptsByTrait = this.conceptsByTrait[0];
  }

  return StudentModel.getConceptState(conceptsByTrait.concepts, conceptId);
};

studentModelSchema.methods.getConceptSnapshot = function(conceptId, timestamp) {
  // Get concept collection by challenge
  let conceptSnapshots = this.snapshotsByConceptId.find((c) => c.conceptId === conceptId);
  if (!conceptSnapshots) {
    // Create new concept collection for this challenge
    this.snapshotsByConceptId.unshift(new SnapshotsByConceptId({
      conceptId: conceptId }));

    conceptSnapshots = this.snapshotsByConceptId[0];
  }

  return StudentModel.getConceptSnapshot(conceptSnapshots.snapshots, conceptId, timestamp);
};

studentModelSchema.methods.addHintToHistory = function(conceptId, scoreByChallenge, challengeId, trait, ruleCriteria, ruleSelected, hintLevel, isBottomOut) {
  this.hintHistory.unshift({
    conceptId: conceptId,
    scoreByChallenge: scoreByChallenge,
    challengeId: challengeId,
    trait: trait,
    ruleCriteria: ruleCriteria,
    ruleSelected: ruleSelected,
    hintLevel: hintLevel,
    isBottomOut: isBottomOut,
    timestamp: new Date()
  });

  return this.hintHistory[0];
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