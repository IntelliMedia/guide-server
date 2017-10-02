const mongoose = require('mongoose');

const conceptObservationSchema = new mongoose.Schema({
  conceptId: String,
  studentId: String,
  challengeId: String,
  isCorrect: Boolean
}, { timestamps: true });

conceptObservationSchema.statics.record = function(conceptId, studentId, challengeId, isCorrect) {
  let observation = new ConceptObservation({
    conceptId: conceptId,
    studentId: studentId,
    challengeId: challengeId,
    isCorrect: isCorrect
  });

  return observation.save();
}

const ConceptObservation = mongoose.model('ConceptObservation', conceptObservationSchema);

module.exports = ConceptObservation;
