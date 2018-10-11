const Student = require('../models/Student');
const moment = require('moment');
const studentController = require('../controllers/student');
const datex = require('../utilities/datex');
const paginate = require('express-paginate');
const MongoQS = require('mongo-querystring');

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
      console.error(err);
      req.flash('errors', { msg: 'Unable to load students. ' + err.toString()});
      return res.redirect(process.env.BASE_PATH);
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
    let filename = 'GuideExport-' + (new Date()).toFilename();
    let filter = req.body.filter ? JSON.parse(req.body.filter) : {};
    if (filter.hasOwnProperty('classId')) {
      filename = 'GuideExport-Class-' + trimClassId(filter.classId);
    }
    studentController.downloadData(filter, filename, res)
      .catch((err) => {
        req.flash('errors', { msg: "Unable to download student data. " + err.toString()});
        res.redirect('back');
      });
  }
};

exports.delete = (req, res) => {
  if (req.body.action == 'delete') {
    let filter = req.body.filter ? JSON.parse(req.body.filter) : {};
    console.info("Delete students -> filter: " + JSON.stringify(filter, null, 2));
    Student.remove(filter).then(() => {
      return res.redirect(process.env.BASE_PATH + 'students');
    })
    .catch((err) => {
      console.error(err);
      req.flash('errors', { msg: 'Unable to delete student. ' + err.toString()});
      return res.redirect(process.env.BASE_PATH + 'students');
    });
  }
};
