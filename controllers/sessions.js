const consolex = require('../utilities/consolex');
const Session = require('../models/Session');
const moment = require('moment');
var Archiver = require('archiver');

/**
 * GET /
 * Sessions page.
 */
exports.index = (req, res) => {
  var activeSessions = [];
  Session.getAllActiveSessions().then((sessions) => {
    activeSessions = sessions;
    return Session.getAllInactiveSessions();
  }).then((inactiveSessions) => {
    res.render('sessions', {
      title: 'Sessions',
      activeSessions: activeSessions,
      inactiveSessions: inactiveSessions
    });
  }).catch((err) => {
    console.error(err);
    req.flash('errors', { msg: err });
  });
};

exports.modify = (req, res) => {
  if (req.body.action == 'downloadAll') {
    console.info("Download all sessions.");
    Session.find({}, (err, sessions) => {
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
      
    });

  } else if (req.body.action == 'deleteAll') {
    console.info("Delete all sessions.");
    Session.remove({}, (err) => {
      return res.redirect('/sessions');
    });
  }
  else if (req.body.action == 'deactivateAll') {
    console.info("Deactivate all sessions.");
    Session.getAllActiveSessions().then((sessions) => {
      for (let session of sessions) {
        Session.deactivate(session);
      }
      return res.redirect('/sessions');
    }).catch((err) => {
      console.error(err);
      req.flash('errors', { msg: err });
    });
  }
};