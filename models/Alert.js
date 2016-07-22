const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  timestamp: Date,
  type: String,
  message: String,
}, { timestamps: true });

const Alert = mongoose.model('Alert', alertSchema);

module.exports = Alert;
