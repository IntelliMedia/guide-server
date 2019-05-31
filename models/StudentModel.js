'use strict';

const mongoose = require('mongoose');
const _ = require('lodash');

const TutorAction = require('./TutorAction');

const bktConceptStateSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true},
  conceptId: { type: String, required: true},
  L0: { type: Number, default: 0},
  probabilityLearned: { type: Number, default: 0},
  totalCorrect: { type: Number, default: 0},
  totalAttempts: { type: Number, default: 0}
}, { _id : false, timestamps: false});
const BktConceptState = mongoose.model('BktConceptState', bktConceptStateSchema);

const misconceptionSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true},
  conceptId: { type: String, required: true},
  challengeId: {  type: String, required: true},
  attribute: {  type: String, required: true},
  substitutionVariables: {  type: mongoose.Schema.Types.Mixed},
  source:  {type: String}
}, { _id : false, timestamps: false });
const Misconception = mongoose.model('Misconception', misconceptionSchema);

const studentModelSchema = new mongoose.Schema({
  bktConceptStates: [bktConceptStateSchema],
  tutorActionHistory: [TutorAction.schema],
  mostRecentMisconceptions: [misconceptionSchema]
}, { timestamps: true });

studentModelSchema.methods.reset = function() {
  this.bktConceptStates = [];
  this.tutorActionHistory = [];
  this.mostRecentMisconceptions = [];
}

// Find/create concept state
studentModelSchema.methods.getBktConceptState = function(conceptId, L0) {
  let conceptState = this.bktConceptStates.find((c) => c.conceptId === conceptId);
  if (!conceptState) {
    // Initialize a new concept state
    this.bktConceptStates.unshift(new BktConceptState({
      timestamp: new Date(),
      conceptId: conceptId,
      probabilityLearned: L0,
      L0: L0,
      totalCorrect: 0,
      totalAttempts: 0 }));

    conceptState = this.bktConceptStates[0];
  }
  return conceptState;
}

studentModelSchema.methods.avgProbabilityLearnedOfAllConcepts = function() {
  if (!this.bktConceptStates || this.bktConceptStates.length == 0) {
    return 0;
  }

  let sumProbabilityLearned = 0;
  this.bktConceptStates.forEach((c) => sumProbabilityLearned += c.probabilityLearned);

  let avgProbabilityLearned = sumProbabilityLearned / this.bktConceptStates.length;

  return avgProbabilityLearned;
};


studentModelSchema.methods.addAction = function(tutorAction) {
  this.tutorActionHistory.unshift(tutorAction);
  return this.tutorActionHistory[0];
}

studentModelSchema.methods.mostRecentAction = function(action, challengeId, attribute) {
  for (let i = 0; i < this.tutorActionHistory.length; ++i) {
    let tutorAction = this.tutorActionHistory[i];
    if (tutorAction.action === action) {
      if (challengeId && tutorAction.context.challengeId != challengeId) {
        break;
      }
      if (!attribute ||  tutorAction.context.attribute == attribute) {
        return tutorAction;
      }
    }
  }

  return null;
}

studentModelSchema.methods.addMisconception = function(conceptId, challengeId, attribute, substitutionVariables, timestamp, source) {

  if (!this.mostRecentMisconceptions) {
    this.mostRecentMisconceptions = [];
  } else if (this.mostRecentMisconceptions.length > 0) {
    let lastTimestamp = this.mostRecentMisconceptions[0].timestamp.getTime();
    if (lastTimestamp < timestamp ||
      this.mostRecentMisconceptions[0].challengeId != challengeId) {
      // Reset list
      this.mostRecentMisconceptions = [];
    }
  }

  this.mostRecentMisconceptions.unshift({
    conceptId: conceptId,
    challengeId: challengeId,
    attribute: attribute,
    substitutionVariables: substitutionVariables,
    timestamp: timestamp,
    source: source
  });

  return this.mostRecentMisconceptions[0];
}

studentModelSchema.methods.getMisconceptionsForEvent = function(event) {
  let misconceptions = this.mostRecentMisconceptions.filter((misconception) => {
    let misconceptionTimestamp = misconception.timestamp.getTime();
    return (misconception.challengeId == event.context.challengeId
      && misconceptionTimestamp == event.time);
  });

  return misconceptions;
}

const StudentModel = mongoose.model('StudentModel', studentModelSchema);
module.exports = StudentModel;
