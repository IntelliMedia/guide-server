const Session = require('../models/Session');
const StudentController = require('../controllers/student');
const moment = require('moment');
var Archiver = require('archiver');

/**
 * GET /
 * Sessions page.
 */
exports.index = (req, res) => {
  var studentId = req.query.studentId;
  var activeSessions = [];
  Session.getAllActiveSessions(studentId).then((sessions) => {
    activeSessions = sessions;
    return Session.getAllInactiveSessions(studentId);
  }).then((inactiveSessions) => {
    res.render('sessions', {
      title: 'Sessions',
      activeSessions: activeSessions,
      inactiveSessions: inactiveSessions,
      studentId: studentId
    });
  }).catch((err) => {
    console.error(err);
    req.flash('errors', { msg: "Unable to load sessions. " + err.toString() });
    return res.redirect(process.env.BASE_PATH + '');
  });
};

exports.modify = (req, res) => {
  if (req.body.action == 'downloadAll') {
    console.info("Download all sessions.");
    Session.find({}).exec()
      .then((sessions) => {
      // Tell the browser that this is a zip file.
        res.writeHead(200, {
            'Content-Type': 'application/zip',
            'Content-disposition': 'attachment; filename=guide-sessions.zip'
        });

        var zip = Archiver('zip');
        zip.pipe(res);

        for (let session of sessions) {
          zip.append(JSON.stringify(session.events, null, 2), { name: session.id + ".json" });
        }
        zip.finalize();
      }).catch((err) => {
        console.error(err);
        req.flash('errors', { msg: "Unable to zip session data. " + err.toString()});
        return res.redirect(process.env.BASE_PATH + '');
      });

  } else if (req.body.action == 'deleteAll') {
    console.info("Delete all sessions.");
    Session.remove({}).then(() => {
      return res.redirect(process.env.BASE_PATH + 'sessions');
    }).catch((err) => {
      console.error(err);
      req.flash('errors', { msg: "Unable to delete session. " + err.toString()});
    });
  }
  else if (req.body.action == 'deactivateAll') {
    console.info("Deactivate all sessions.");
    Session.getAllActiveSessions().then((sessions) => {
      for (let session of sessions) {
        exports.deactivate(session);
      }
      return res.redirect(process.env.BASE_PATH + 'sessions');
    }).catch((err) => {
      console.error(err);
      req.flash('errors', { msg: "Unable to deactivate sessions. " + err.toString()});
    });
  }
};

exports.deactivate = (session) => {
  console.info("Session deactivate");
  session.active = false;
  if (session.events.length > 0) {
    session.endTime = session.events[session.events.length-1].time;
  } else {
    session.endTime = Date.now();
  }
  return session.save()
    .then(() => {
        if (session.studentId.startsWith("TEMP-")) {
          console.info("Delete temp user");
          return StudentController.deleteStudent(session.studentId);
        } else {
          return Promise.resolve();
        }
    });
}