const User = require('../models/User');
const authz = require('../services/authorization');
const Audit = require('../models/Audit');
const Alert = require('../models/Alert');
const BKTParameterLearner = require("../services/bktParameterLearner");
const StudentIdsRepository = require("../storage/studentIdsRepository");
const StudentController = require('../controllers/student');
const datex = require('../utilities/datex');
const path = require('path');
const fs = require('fs');
const os = require('os');

exports.index = (req, res) => {
  const userId = (req.params.userId ? req.params.userId : req.user.id);

  User.findById(userId, (err) => {
    if (err) { return next(err); }

    authz.acl.userRoles( userId, (roleErr) =>
    {
      if (roleErr) { return next(roleErr); }

      res.render('tools', {
        title: 'Tools'
      });
    });
  });
};

exports.post = (req, res) => {

  let docId = req.body.studentsSheetId;
  if (!docId) {
    Alert.flash(req, "Google Sheet Doc ID is blank");
    return res.redirect(process.env.BASE_PATH + 'tools');
  }

  let begin=Date.now();

  let studentIdsRepository = new StudentIdsRepository();
  studentIdsRepository.loadCollectionAsync(docId, true)
  .then((studentIds) =>
  { 
    if (!studentIds || studentIds.length == 0) {
      throw new Error("Unable to find student IDs in Google Sheet: " + docId);
    }

    if (req.body.action === 'learn-parameters') {
      return learnParameters(req, res, docId, studentIds);
    } else if (req.body.action === 'download') {
      return download(req, res, docId, studentIds);
    } else {
      throw new Error(`Unknown action: ${req.body.action}`)
    }
  })
  .catch((err) => {
    Alert.flash(req, err);
    res.redirect('back');
  })
  .finally(() => {
    let end= Date.now();
    let timeSpent=(end-begin)/1000;
    console.info("Run time: %f seconds", timeSpent);
  });
};

function learnParameters(req, res, docId, studentIds) {
  let parameterLearner = new BKTParameterLearner(); 
  Audit.record(req.user.email, 'started', 'BKT parameter learning', `docId: ${docId}\ntotal student Ids: ${studentIds.length}`);
  return parameterLearner.runAsync(studentIds).then((parameterLearner) => {
    let datetime = parameterLearner.startTime.toFilename();

    // Write to parameters CSV file
    let filename = 'bkt-parameters-' + (datetime + ".csv");
    let outfile = path.resolve(os.tmpdir(), filename);
    fs.writeFileSync(outfile, parameterLearner.outputCsv);
    console.log(`Generated: ${outfile}`);

    // Write stats to CSV file
    filename = 'bkt-learning-stats-' + (datetime + ".csv");
    outfile = path.resolve(os.tmpdir(), filename);
    fs.writeFileSync(outfile, parameterLearner.statsCsv);
    console.log(`Generated: ${outfile}`);     

    // Send back to requestor
    res.set({"Content-Disposition":`attachment; filename=\"${filename}\"`});
    res.send(parameterLearner.outputCsv);
  })  
};

function download(req, res, docId, studentIds) {
  let exportName = 'Students-' + (new Date()).toFilename();
  filter = {'id': { $in: studentIds }};
  Audit.record(req.user.email, 'downloaded', 'student data', `docId: ${docId}\ntotal student Ids: ${studentIds.length}`);
  return StudentController.downloadData(filter, exportName, res);
};