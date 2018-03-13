const mongoose = require('mongoose');

const conceptObservationSchema = new mongoose.Schema({
  timestamp: Date,
  conceptId: String,
  trait: String,
  studentId: String,
  challengeId: String,
  isCorrect: Boolean
});

conceptObservationSchema.statics.record = function(timestamp, conceptId, trait, studentId, challengeId, isCorrect) {
  let observation = new ConceptObservation({
    timestamp: timestamp,
    conceptId: conceptId,
    trait: trait,
    studentId: studentId,
    challengeId: challengeId,
    isCorrect: isCorrect
  });

  return observation.save();
}

const ConceptObservation = mongoose.model('ConceptObservation', conceptObservationSchema);

module.exports = ConceptObservation;
