const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  timestamp: Date,
  type: String,
  message: String,
  details: String
}, { timestamps: false });

const Alert = mongoose.model('Alert', alertSchema);

module.exports = Alert;
