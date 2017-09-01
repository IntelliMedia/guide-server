"use strict";

var guideInfo = require('./package');
console.info("%s %s", guideInfo.name, guideInfo.version);

/**
 * Setup global promise lib
 */
require('bluebird');

const consolex = require('./utilities/consolex');

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
switch(process.env.NODE_ENV){
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
const apiController = require('./controllers/api');
const contactController = require('./controllers/contact');
const socketManager = require('./controllers/socketManager');
const authz = require('./controllers/authorization');

const tutor = require('./controllers/tutor');

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
    authz.initialize(dbc, (err) =>
    {
        if (err) { 
          console.error('Unable to initialize AuthZ: ' + err)
          process.exit(1);
        }
        else {
          app.use( function( req, res, next) {
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
 * Initialize Tutor
 */
tutor.initialize().then(() => {
  console.info('Tutor initialized');
})
.catch((err) => {
  consolex.exception(err);
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
  // After successful login, redirect back to /api, /contact or /
  if (/(api)|(contact)|(^\/$)/i.test(req.path)) {
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

/*****************************************************************************
 * Functions
 */

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
app.get('/groups', authz.middleware(1), groupsController.index);
app.post('/groups/modify', authz.middleware(1), groupsController.modify);
app.get('/group/:groupId', authz.middleware(1), groupController.index);
app.delete('/group/:groupId', authz.middleware(1), groupController.delete);
app.post('/group/modify', authz.middleware(1), groupController.modify);
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
app.get('/contact', contactController.getContact);
app.post('/contact', contactController.postContact);
app.get('/account/:userId?', authz.usersMiddleware(), userController.getAccount);
app.post('/account/profile/:userId?', authz.usersMiddleware(), userController.postUpdateProfile);
app.post('/account/roles/:userId?', authz.middleware(2), userController.postUpdateRoles);
app.post('/account/password/:userId?', authz.usersMiddleware(), userController.postUpdatePassword);
app.post('/account/delete/:userId?', authz.usersMiddleware(), userController.postDeleteAccount);
app.get('/account/unlink/:provider/:userId?', authz.usersMiddleware(), userController.getOauthUnlink);

/**
 * API examples routes.
 */
app.get('/api/student/:studentId',  authz.middleware(1), apiController.getStudent);
/*
app.get('/api', apiController.getApi);
app.get('/api/lastfm', apiController.getLastfm);
app.get('/api/nyt', apiController.getNewYorkTimes);
app.get('/api/aviary', apiController.getAviary);
app.get('/api/steam', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getSteam);
app.get('/api/stripe', apiController.getStripe);
app.post('/api/stripe', apiController.postStripe);
app.get('/api/scraping', apiController.getScraping);
app.get('/api/twilio', apiController.getTwilio);
app.post('/api/twilio', apiController.postTwilio);
app.get('/api/clockwork', apiController.getClockwork);
app.post('/api/clockwork', apiController.postClockwork);
app.get('/api/foursquare', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getFoursquare);
app.get('/api/tumblr', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getTumblr);
app.get('/api/facebook', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getFacebook);
app.get('/api/github', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getGithub);
app.get('/api/twitter', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getTwitter);
app.post('/api/twitter', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.postTwitter);
app.get('/api/venmo', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getVenmo);
app.post('/api/venmo', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.postVenmo);
app.get('/api/linkedin', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getLinkedin);
app.get('/api/instagram', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getInstagram);
app.get('/api/yahoo', apiController.getYahoo);
app.get('/api/paypal', apiController.getPayPal);
app.get('/api/paypal/success', apiController.getPayPalSuccess);
app.get('/api/paypal/cancel', apiController.getPayPalCancel);
app.get('/api/lob', apiController.getLob);
app.get('/api/bitgo', apiController.getBitGo);
app.post('/api/bitgo', apiController.postBitGo);
app.get('/api/upload', apiController.getFileUpload);
app.post('/api/upload', upload.single('myFile'), apiController.postFileUpload);
app.get('/api/pinterest', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getPinterest);
app.post('/api/pinterest', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.postPinterest);
*/

/**
 * OAuth authentication routes. (Sign in)
 */
app.get('/auth/instagram', passport.authenticate('instagram'));
app.get('/auth/instagram/callback', passport.authenticate('instagram', { failureRedirect: '/login' }), (req, res) => {
  res.redirect(req.session.returnTo || '/');
});
app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email', 'user_location'] }));
app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login' }), (req, res) => {
  res.redirect(req.session.returnTo || '/');
});
app.get('/auth/github', passport.authenticate('github'));
app.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: '/login' }), (req, res) => {
  res.redirect(req.session.returnTo || '/');
});
app.get('/auth/google', passport.authenticate('google', { scope: 'profile email' }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
  res.redirect(req.session.returnTo || '/');
});
app.get('/auth/twitter', passport.authenticate('twitter'));
app.get('/auth/twitter/callback', passport.authenticate('twitter', { failureRedirect: '/login' }), (req, res) => {
  res.redirect(req.session.returnTo || '/');
});
app.get('/auth/linkedin', passport.authenticate('linkedin', { state: 'SOME STATE' }));
app.get('/auth/linkedin/callback', passport.authenticate('linkedin', { failureRedirect: '/login' }), (req, res) => {
  res.redirect(req.session.returnTo || '/');
});

/**
 * OAuth authorization routes. (API examples)
 */
app.get('/auth/foursquare', passport.authorize('foursquare'));
app.get('/auth/foursquare/callback', passport.authorize('foursquare', { failureRedirect: '/api' }), (req, res) => {
  res.redirect('/api/foursquare');
});
app.get('/auth/tumblr', passport.authorize('tumblr'));
app.get('/auth/tumblr/callback', passport.authorize('tumblr', { failureRedirect: '/api' }), (req, res) => {
  res.redirect('/api/tumblr');
});
app.get('/auth/venmo', passport.authorize('venmo', { scope: 'make_payments access_profile access_balance access_email access_phone' }));
app.get('/auth/venmo/callback', passport.authorize('venmo', { failureRedirect: '/api' }), (req, res) => {
  res.redirect('/api/venmo');
});
app.get('/auth/steam', passport.authorize('openid', { state: 'SOME STATE' }));
app.get('/auth/steam/callback', passport.authorize('openid', { failureRedirect: '/login' }), (req, res) => {
  res.redirect(req.session.returnTo || '/');
});
app.get('/auth/pinterest', passport.authorize('pinterest', { scope: 'read_public write_public' }));
app.get('/auth/pinterest/callback', passport.authorize('pinterest', { failureRedirect: '/login' }), (req, res) => {
  res.redirect('/api/pinterest');
});  
}
