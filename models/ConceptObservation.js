const mongoose = require('mongoose');

const conceptObservationSchema = new mongoose.Schema({
  timestamp: Date,
  conceptId: String,
  probabilityLearned: { type: Number, default: 0},
  attribute: String,
  studentId: String,
  challengeType: String,
  challengeId: String,
  isCorrect: Boolean
}, {timestamps: false});

conceptObservationSchema.statics.record = function(timestamp, conceptId, probabilityLearned, attribute, studentId, challengeType, challengeId, isCorrect) {
  let observation = new ConceptObservation({
    timestamp: timestamp,
    conceptId: conceptId,
    probabilityLearned: probabilityLearned,
    attribute: attribute,
    studentId: studentId,
    challengeType: challengeType,
    challengeId: challengeId,
    isCorrect: isCorrect
  });

  return observation.save();
}

const ConceptObservation = mongoose.model('ConceptObservation', conceptObservationSchema);

module.exports = ConceptObservation;
