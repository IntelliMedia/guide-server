const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema({
  timestamp: Date,
  user: String,
  action: String,
  target: String,
  details: String
}, { timestamps: false });

auditSchema.statics.record = function(user, action, target, details) {

  let newAudit = Audit({
          timestamp: Date.now(),
          user: user,
          action: action,
          target: target,
          details: details
      });
  newAudit.save();
}

const Audit = mongoose.model('Audit', auditSchema);

module.exports = Audit;
