const Student = require('../models/Student');
const moment = require('moment');
const studentController = require('../controllers/student');
const datex = require('../utilities/datex');
const paginate = require('express-paginate');
const MongoQS = require('mongo-querystring');
const Audit = require('../models/Audit');
const Alert = require('../models/Alert');

/**
 * GET /
 * Students page.
 */
exports.index = (req, res) => {
  var qs = new MongoQS();
  let filter = qs.parse(req.query);

  let subtitle;
  if (req.query.classId) {
    filter = {'classId': req.query.classId};
    subtitle = `Class: ${req.query.classId}`;
  }

  let itemCount = 0;
  Student.count(filter)
    .then((resultsCount) => {
        itemCount = resultsCount;
        return Student.find(filter).sort({id: 1}).limit(req.query.limit).skip(req.skip).exec();
    })
    .then((students) => {
      const pageCount = Math.ceil(itemCount / req.query.limit);

      res.render('students', {
        title: 'Students',
        subtitle: subtitle,
        filter: JSON.stringify(filter),
        students: students,
        pageCount,
        itemCount,
        pages: paginate.getArrayPages(req)(3, pageCount, req.query.page)
      })
    })
    .catch((err) => {
      Alert.flash(req, 'Unable to display students page', err);
      res.render('error');
    });
};

function compareId(a,b) {
  if (a.id < b.id)
    return -1;
  if (a.id > b.id)
    return 1;
  return 0;
}

function trimClassId(classId) {
  return classId.substr(classId.lastIndexOf('/') + 1);
}

exports.post = (req, res) => {
  if (req.body.action == 'download') {
    let exportName = (new Date()).toFilename();
    let filter = req.body.filter ? JSON.parse(req.body.filter) : {};
    if (filter.hasOwnProperty('classId')) {
      exportName = 'Class-' + trimClassId(filter.classId);
    }
    Audit.record(req.user.email, 'downloaded', 'student data', JSON.stringify(filter, null, 2));
    studentController.downloadData(filter, exportName, res)
      .catch((err) => {
        Alert.flash(req, 'Unable to download students\' data', err);
        res.redirect('back');
      });
  }
};

exports.delete = (req, res) => {
  if (req.body.action == 'delete') {
    let filter = req.body.filter ? JSON.parse(req.body.filter) : {};
    console.info("Delete students -> filter: " + JSON.stringify(filter, null, 2));
    Audit.record(req.user.email, 'deleted', 'students', JSON.stringify(filter, null, 2));
    Student.remove(filter).then(() => {
      return res.redirect(process.env.BASE_PATH + 'students');
    })
    .catch((err) => {
      Alert.flash(req, 'Unable to delete students', err);
      res.redirect('back');
    });
  }
};
