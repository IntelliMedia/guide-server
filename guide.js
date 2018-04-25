"use strict";

var guideInfo = require('./package');
console.info("%s %s", guideInfo.name, guideInfo.version);

/**
 * Setup global promise lib
 */
require('bluebird');

/**
 * Module dependencies.
 */
const express = require('express');
const compression = require('compression');
const session = require('express-session');
const bodyParser = require('body-parser');
const logger = require('morgan');
const errorHandler = require('errorhandler');
const lusca = require('lusca');
const dotenv = require('dotenv');
const MongoStore = require('connect-mongo')(session);
const flash = require('express-flash');
const path = require('path');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const passport = require('passport');
const expressValidator = require('express-validator');
const sass = require('node-sass-middleware');
const multer = require('multer');
const upload = multer({ dest: path.join(__dirname, 'uploads') });
const cors = require('cors');
const http = require('http');

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
switch (process.env.NODE_ENV) {
  case 'production':
    console.info('Server configured for production');
    dotenv.load({ path: '.env.production' });
    break;

  default:
    console.info('Server configured for development');
    dotenv.load({ path: '.env.example' });
}

/**
 * Controllers (route handlers).
 */
const homeController = require('./controllers/home');
const sessionsController = require('./controllers/sessions');
const sessionController = require('./controllers/session');
const studentsController = require('./controllers/students');
const studentController = require('./controllers/student');
const hintsController = require('./controllers/hints');
const groupsController = require('./controllers/groups');
const groupController = require('./controllers/group');
const alertsController = require('./controllers/alerts');
const usersController = require('./controllers/users');
const userController = require('./controllers/user');
const socketManager = require('./services/socketManager');
const StudentDataVisualization = require('./services/studentDataVisualization');
const authz = require('./services/authorization');

/**
 * API keys and Passport configuration.
 */
const passportConfig = require('./config/passport');

/**
 * Create Express server.
 */
const app = express();
app.locals.version = guideInfo.version;

app.locals.moment = require('moment');

// Pretty print JSON
app.set('json spaces', 2);
/**
 * Connect to MongoDB.
 */
var dbc = mongoose.connect('mongodb://localhost/guide2', {
  useMongoClient: true
});

mongoose.connection.on('open', function (ref) {
  console.log('Connected to mongo server.');

  // Initialize authorization module
  authz.initialize(dbc, (err) => {
    if (err) {
      console.error('Unable to initialize AuthZ: ' + err)
      process.exit(1);
    }
    else {
      app.use(function (req, res, next) {
        req.acl = authz.acl;
        authz.getIsAllowed(req.user, (isAllowed, isAllowedErr) => {
          if (isAllowedErr) {
            console.error('Unable to get isAllowed function: ' + isAllowedErr);
            next(isAllowedErr);
            return;
          }
          res.locals.isAllowed = isAllowed;
          next();
        });
      });

      initializeRoutes();
    }
  });
});
mongoose.connection.on('error', () => {
  console.error('MongoDB Connection Error. Please make sure that MongoDB is running.');
  process.exit(1);
});
mongoose.connection.on('disconnected', () => {
  console.log('Mongoose default connection disconnected');
});

/**
 * Express configuration.
 */
var corsOptions = {
  credentials: true,
  origin: true
};
app.use(cors(corsOptions));
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(compression());
app.use(sass({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public')
}));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator());
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: process.env.SESSION_SECRET,
  store: new MongoStore({
    url: process.env.MONGODB_URI || process.env.MONGOLAB_URI,
    autoReconnect: true
  })
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());
app.use((req, res, next) => {
  if (req.path === '/api/upload' || req.path.indexOf('/api/') == 0) {
    next();
  } else {
    lusca.csrf()(req, res, next);
  }
});
app.use(lusca.xframe('SAMEORIGIN'));
app.use(lusca.xssProtection(true));
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});
app.use((req, res, next) => {
  // After successful login, redirect back to /api or /
  if (/(api)|(^\/$)/i.test(req.path)) {
    req.session.returnTo = req.path;
  }
  next();
});
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 }));

/**
 * Error Handler.
 */
app.use(errorHandler());

/**
 * Start HTTP server.
 */
var server = http.Server(app);

/**
 * Start Express server.
 */
server.listen(app.get('port'), () => {
  console.log('Express server listening on port %d in %s mode', app.get('port'), app.get('env'));
});

/**
 * Start WebSocket listener.
 */
socketManager.initialize(server);

module.exports = app;

function initializeRoutes() {
  /**
   * Primary app routes.
   */
  app.get('/', homeController.index);
  app.get('/sessions', authz.middleware(), sessionsController.index);
  app.post('/sessions/modify', authz.middleware(1), sessionsController.modify);
  app.get('/session/:sessionId', authz.middleware(1), sessionController.index);
  app.get('/session/:sessionId/event/:eventIndex', authz.middleware(1), sessionController.event);
  app.get('/students', authz.middleware(1), studentsController.index);
  app.post('/students/modify', authz.middleware(1), studentsController.modify);
  app.get('/student/:studentId', authz.middleware(1), studentController.index);
  app.post('/student/reset', authz.middleware(), studentController.reset);
  app.get('/student/:studentId/hints', authz.middleware(1), hintsController.index);
  app.get('/api/student/:studentId', authz.middleware(1), StudentDataVisualization.getStudent);
  app.get('/groups', authz.middleware(1), groupsController.index);
  app.post('/groups/modify', authz.middleware(1), groupsController.modify);
  app.get('/group/:groupId', authz.middleware(1), groupController.index);
  app.delete('/group/:groupId', authz.middleware(1), groupController.delete);
  app.post('/group/modify', authz.middleware(1), groupController.modify);
  app.post('/group/clear-cache', authz.middleware(1), groupController.clearCache);  
  app.post('/group/duplicate', authz.middleware(1), groupController.duplicate);
  app.get('/alerts', authz.middleware(), alertsController.index);
  app.post('/alerts/clear', authz.middleware(1), alertsController.clear);
  app.get('/users', usersController.index);
  app.get('/login', userController.getLogin);
  app.post('/login', userController.postLogin);
  app.get('/logout', userController.logout);
  app.get('/forgot', userController.getForgot);
  app.post('/forgot', userController.postForgot);
  app.get('/reset/:token', userController.getReset);
  app.post('/reset/:token', userController.postReset);
  app.get('/signup', userController.getSignup);
  app.post('/signup', userController.postSignup);
  app.get('/account/:userId?', authz.usersMiddleware(), userController.getAccount);
  app.post('/account/profile/:userId?', authz.usersMiddleware(), userController.postUpdateProfile);
  app.post('/account/roles/:userId?', authz.middleware(2), userController.postUpdateRoles);
  app.post('/account/password/:userId?', authz.usersMiddleware(), userController.postUpdatePassword);
  app.post('/account/delete/:userId?', authz.usersMiddleware(), userController.postDeleteAccount);
  app.get('/account/unlink/:provider/:userId?', authz.usersMiddleware(), userController.getOauthUnlink);

  /**
   * OAuth authentication routes. (Sign in)
   */
  app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email', 'user_location'] }));
  app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login' }), (req, res) => {
    res.redirect(req.session.returnTo || '/');
  });
  app.get('/auth/google', passport.authenticate('google', { scope: 'profile email' }));
  app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
    res.redirect(req.session.returnTo || '/');
  });
}
