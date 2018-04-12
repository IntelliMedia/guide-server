const mongoose = require('mongoose');

const conceptObservationSchema = new mongoose.Schema({
  timestamp: Date,
  conceptId: String,
  attribute: String,
  studentId: String,
  challengeId: String,
  isCorrect: Boolean
});

conceptObservationSchema.statics.record = function(timestamp, conceptId, attribute, studentId, challengeId, isCorrect) {
  let observation = new ConceptObservation({
    timestamp: timestamp,
    conceptId: conceptId,
    attribute: attribute,
    studentId: studentId,
    challengeId: challengeId,
    isCorrect: isCorrect
  });

  return observation.save();
}

const ConceptObservation = mongoose.model('ConceptObservation', conceptObservationSchema);

module.exports = ConceptObservation;
