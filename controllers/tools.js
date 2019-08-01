const async = require('async');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const passport = require('passport');
const User = require('../models/User');
const authz = require('../services/authorization');
const _ = require('underscore');
const Audit = require('../models/Audit');
const Alert = require('../models/Alert');
const BKTParameterLearner = require("../services/BKTParameterLearner");
const StudentIdsRepository = require("../storage/StudentIdsRepository");

exports.index = (req, res) => {
  const userId = (req.params.userId ? req.params.userId : req.user.id);

  User.findById(userId, (err, user) => {
    if (err) { return next(err); }

    authz.acl.userRoles( userId, (roleErr, roles) =>
    {
      if (roleErr) { return next(roleErr); }

      res.render('tools', {
        title: 'Tools'
      });
    });
  });
};

exports.post = (req, res) => {
  if (req.body.action == 'learn-parameters') {
    learnParameters(req, res);
  }
};

function learnParameters(req, res) {
  
  let docId = req.body.studentsSheetId;
  if (!docId) {
    Alert.flash(req, "Google Sheet Doc ID is blank");
    return res.redirect(process.env.BASE_PATH + 'tools');
  }

  console.info("Start ML using students from: " + docId);
  let begin=Date.now();

  let studentIdsRepository = new StudentIdsRepository();
  studentIdsRepository.loadCollectionAsync(docId, true)
  .then((studentIds) =>
  {
    let parameterLearner = new BKTParameterLearner(); 
    return parameterLearner.runAsync(studentIds);
  })
  .then((csv) => {
    let end= Date.now();
    let timeSpent=(end-begin)/1000;
    console.info("Run time: %f seconds", timeSpent);

    res.set({"Content-Disposition":"attachment; filename=\"bkt-parameters.csv\""});
    res.send(csv);
  })
  .catch((err) => {
    Alert.flash(req, err);
    res.redirect('back');
  });
};