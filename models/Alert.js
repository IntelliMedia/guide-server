const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  timestamp: Date,
  type: String,
  message: String,
}, { timestamps: true });

const Alert = mongoose.model('Alert', userSchema);

module.exports = Alert;
