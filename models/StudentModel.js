const mongoose = require('mongoose');
const _ = require('lodash');

const hintDeliveredSchema = new mongoose.Schema({
  conceptId: { type: String, required: true},
  score: { type: Number, default: 0},
  challengeId: String,
  ruleCriteria: String, 
  ruleSelected: String,
  hintLevel: { type: Number, default: 0},
  timestamp: Date
}, { _id : false });
const HintDelivered = mongoose.model('HintDelivered', hintDeliveredSchema);

function createConceptStateSchema(additionalField) {
  let schema = new mongoose.Schema({
    conceptId: { type: String, required: true},
    score: { type: Number, default: 0},
    totalCorrect: { type: Number, default: 0},
    totalAttempts: { type: Number, default: 0},
    totalHintsDelivered:{ type: Number, default: 0}
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

const studentModelSchema = new mongoose.Schema({
  concepts: [conceptStateSchema],
  conceptsByChallenge: [conceptsByChallengeIdSchema],
  conceptsByTrait: [conceptsByTraitSchema],
  hintHistory: [hintDeliveredSchema],
  snapshotsByConceptId: [snapshotsByConceptIdSchema]
}, { timestamps: true });

studentModelSchema.methods.reset = function() {
  this.concepts = [];
  this.conceptsByChallenge = [];
  this.conceptsByTrait = [];
  this.hintHistory = [];
  this.conceptSnapshots = [];
}

// Reusable method that is used to find/create ConceptState in a collection
// This method is reused for multiple collections in the StudentModel
studentModelSchema.statics.getConceptState = function(collection, conceptId) {
  let conceptState = collection.find((c) => c.conceptId === conceptId);
  if (!conceptState) {
    collection.push(new ConceptState({
      conceptId: conceptId }));

    conceptState = collection[0];
  }
  return conceptState;
}

// Reusable method for finding time-based concept data
studentModelSchema.statics.getConceptSnapshot = function(collection, conceptId, timestamp) {
  let conceptSnapshot = collection.find((c) => c.conceptId === conceptId && c.timestamp === timestamp);
  if (!conceptSnapshot) {
    collection.push(new ConceptSnapshot({
      conceptId: conceptId,
      timestamp: timestamp}));

    conceptSnapshot = collection[0];
  }
  return conceptSnapshot;
}

studentModelSchema.methods.getConcept = function(conceptId) {
  return StudentModel.getConceptState(this.concepts, conceptId);
};

studentModelSchema.methods.getConceptByChallenge = function(conceptId, challengeId) {
  // Get concept collection by challenge
  let conceptsByChallenge = this.conceptsByChallenge.find((c) => c.challengeId === challengeId);
  if (!conceptsByChallenge) {
    // Create new concept collection for this challenge
    this.conceptsByChallenge.push(new ConceptsByChallengeId({
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
    this.conceptsByTrait.push(new ConceptsByTrait({
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
    this.snapshotsByConceptId.push(new SnapshotsByConceptId({
      conceptId: conceptId }));

    conceptSnapshots = this.snapshotsByConceptId[0];
  }

  return StudentModel.getConceptSnapshot(conceptSnapshots.snapshots, conceptId, timestamp);
};

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

studentModelSchema.methods.getConceptIds = function () {
  return _.uniq(this.concepts.map(function(a) {return a.conceptId;})).sort();
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
