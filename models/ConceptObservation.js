const mongoose = require('mongoose');

const conceptObservationSchema = new mongoose.Schema({
  timestamp: Date,
  conceptId: String,
  studentId: String,
  challengeId: String,
  isCorrect: Boolean
}, { timestamps: true });

const ConceptObservation = mongoose.model('ConceptObservation', conceptObservationSchema);

module.exports = ConceptObservation;
