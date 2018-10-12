const async = require('async');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const passport = require('passport');
const User = require('../models/User');
const authz = require('../services/authorization');
const _ = require('underscore');
const Audit = require('../models/Audit');
const Alert = require('../models/Alert');

/**
 * GET /login
 * Login page.
 */
exports.getLogin = (req, res) => {
  if (req.user) {
    return res.redirect(process.env.BASE_PATH + '');
  }
  res.render('account/login', {
    title: 'Login'
  });
};

/**
 * POST /login
 * Sign in using email and password.
 */
exports.postLogin = (req, res, next) => {
  req.assert('email', 'Email is not valid').isEmail();
  req.assert('password', 'Password cannot be blank').notEmpty();
  req.sanitize('email').normalizeEmail({ remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    Alert.flash(req, 'Unable to sign in', err);
    return res.redirect(process.env.BASE_PATH + 'login');
  }

  passport.authenticate('local', (err, user, info) => {
    if (err) { return next(err); }
    if (!user) {
      Alert.flash(req, info, err);
      return res.redirect(process.env.BASE_PATH + 'login');
    }
    req.logIn(user, (err) => {
      if (err) { return next(err); }
      req.flash('success', { msg: 'Success! You are logged in.' });
      res.redirect(req.session.returnTo || './');
    });
  })(req, res, next);
};

/**
 * GET /logout
 * Log out.
 */
exports.logout = (req, res) => {
  req.logout();
  res.redirect(process.env.BASE_PATH + '');
};

/**
 * GET /signup
 * Signup page.
 */
exports.getSignup = (req, res) => {
  if (req.user) {
    return res.redirect(process.env.BASE_PATH + '');
  }
  res.render('account/signup', {
    title: 'Create Account'
  });
};

/**
 * POST /signup
 * Create a new local account.
 */
exports.postSignup = (req, res, next) => {
  req.assert('email', 'Email is not valid').isEmail();
  req.assert('password', 'Password must be at least 4 characters long').len(4);
  req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);
  req.sanitize('email').normalizeEmail({ remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    Alert.flash(req, errors);
    return res.redirect(process.env.BASE_PATH + 'signup');
  }

  const newUser = new User();
  newUser.email = req.body.email;
  newUser.password = req.body.password;

  exports.createUser(newUser, (user, err) => {
    if (err) {
      Alert.flash(req, 'Unable to create account', err);
      res.redirect(process.env.BASE_PATH + 'signup');
    }
    else {
      Audit.record(newUser.email, 'created', 'account', user.id);
      req.logIn(user, (logInErr) => {
        if (logInErr) { return next(logInErr); }
        req.flash('success', { msg: 'Success! New account created.' });
        res.redirect(req.session.returnTo || './');
      });
    }
  });
};

/**
 * Save user object to database and assign initial role
 */
exports.createUser = (user, cb) => {

  // Does the user already exist in database?
  User.findOne({ email: user.email }).exec().then((existingUser) => {
    if (existingUser) {
      throw 'Account with that email address already exists.';
    }
    return user.save();
  })
  // Save new user in database
  .then((user) => {
    return authz.acl.roleUsers("administrator");
  })
  // Add role to new user
  .then((adminUsers) => {
    // If there isn't at least one admin, make this user the admin
    if (adminUsers.length == 0) {
      return authz.acl.addUserRoles(user.id, "administrator");
    }
    else {
      return authz.acl.addUserRoles(user.id, "guest");
    }
  })
  // Callback with user or error
  .then(() => {
    cb(user);
  })
  .catch((err) => {
    console.error(err);
    cb(null, err);
  });
};

/**
 * Get the user ID of the resource being modified and the URL suffix
 * for cases where the user being edited isn't the current user.
 */
function extractUserInfo(req, res) {
  const userId = (req.params.userId ? req.params.userId : req.user.id);
  const userUrl = (req.params.userId ? req.params.userId : '');

    return {
    id: userId,
    url: userUrl
  };
}

/**
 * GET /account
 * Profile page.
 */
exports.getAccount = (req, res) => {
  const userInfo = extractUserInfo(req, res);
  User.findById(userInfo.id, (err, user) => {
    if (err) { return next(err); }

    authz.acl.userRoles( userInfo.id, (roleErr, roles) =>
    {
      if (roleErr) { return next(roleErr); }

      res.render('account/profile', {
        title: 'Account Management',
        selectedUser: user,
        selectedUserRoles: roles
      });
    });
  });
};

/**
 * POST /account/profile
 * Update profile information.
 */
exports.postUpdateProfile = (req, res, next) => {
  const userInfo = extractUserInfo(req, res);

  req.assert('email', 'Please enter a valid email address.').isEmail();
  req.sanitize('email').normalizeEmail({ remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    Alert.flash(req, errors);
    return res.redirect(process.env.BASE_PATH + 'account/' + userInfo.url);
  }

  User.findById(userInfo.id, (err, user) => {
    if (err) { return next(err); }
    user.email = req.body.email || '';
    user.profile.name = req.body.name || '';
    user.profile.gender = req.body.gender || '';
    user.profile.location = req.body.location || '';
    user.profile.website = req.body.website || '';
    user.save((err) => {
      if (err) {
        if (err.code === 11000) {

          let msg = 'The email address you have entered is already associated with an account.';
          Alert.flash(req, msg);
          return res.redirect(process.env.BASE_PATH + 'account/' + userInfo.url);
        } else {
          Alert.flash(req, "Unable to update profile", err);
        }
        return next(err);
      }
      req.flash('success', { msg: 'Profile information has been updated.' });
      res.redirect(process.env.BASE_PATH + 'account/' + userInfo.url);
    });
  });
};

/**
 * POST /account/roles
 * Update user roles
 */
exports.postUpdateRoles = (req, res, next) => {
  const userInfo = extractUserInfo(req, res);

  var selectedRoles = [];
  if (req.body.administratorCheckbox == 'on') {
    selectedRoles.push('administrator');
  }
  if (req.body.researcherCheckbox == 'on') {
    selectedRoles.push('researcher');
  }
  if (req.body.guestCheckbox == 'on') {
    selectedRoles.push('guest');
  }

  // Get user object from ID
  Audit.record(req.user.email, 'updated', 'roles', `${userInfo.id} -> (${selectedRoles.join(',')})`);
  User.findById(userInfo.id).then((user) => {
    return authz.acl.userRoles(userInfo.id);
  })
  // Remove deselected roles
  .then((roles) => {
    var removedRoles = _.difference(roles, selectedRoles);
    if (removedRoles.length > 0) {
      return authz.acl.removeUserRoles(userInfo.id, removedRoles).then(() => {
          return Promise.resolve(roles);
        });
    }
    else
    {
      return Promise.resolve(roles);
    }
  })
  // Add selected roles
  .then((roles) => {
    var addedRoles = _.difference(selectedRoles, roles);
    if (addedRoles.length > 0) {
      return authz.acl.addUserRoles(userInfo.id, addedRoles).then(() => {
          return Promise.resolve(roles);
        });
    }
    else
    {
      return Promise.resolve(roles);
    }
  })
  // Refresh page
  .then(() => {
    req.flash('success', { msg: 'Role(s) have been changed.' });
    res.redirect(process.env.BASE_PATH + 'account/' + userInfo.url);
  })
  .catch((err) => {
    console.error(err);
    next(err);
  });
};

/**
 * POST /account/password
 * Update current password.
 */
exports.postUpdatePassword = (req, res, next) => {
  const userInfo = extractUserInfo(req, res);

  req.assert('password', 'Password must be at least 4 characters long').len(4);
  req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);

  const errors = req.validationErrors();

  if (errors) {
    Alert.flash(req, errors);
    return res.redirect(process.env.BASE_PATH + 'account/' + userInfo.url);
  }

  Audit.record(req.user.email, 'updated', 'password', userInfo.id);
  User.findById(userInfo.id, (err, user) => {
    if (err) { return next(err); }
    user.password = req.body.password;
    user.save((err) => {
      if (err) { return next(err); }
      req.flash('success', { msg: 'Password has been changed.' });
      res.redirect(process.env.BASE_PATH + 'account/' + userInfo.url);
    });
  });
};

/**
 * POST /account/delete
 * Delete user account.
 */
exports.postDeleteAccount = (req, res, next) => {
  const userInfo = extractUserInfo(req, res);

  // Remove all roles assigned to this user
  Audit.record(req.user.email, 'deleted', 'account', userInfo.id);
  authz.acl.userRoles( userInfo.id).then((roles) => {
    if (roles.length > 0) {
      return authz.acl.removeUserRoles( userInfo.id, roles);
    }
    else {
      return Promise.resolve();
    }
  })
  // Remove user from database
  .then(() =>
  {
    return User.remove({ _id: userInfo.id });
  })
  .then(() => {
        if (userInfo.id == req.user.id) {
          req.logout();
          req.flash('info', { msg: 'Your account has been deleted.' });
          res.redirect(process.env.BASE_PATH + '');
        } else {
          req.flash('success', { msg: 'User account has been deleted.' });
          res.redirect(process.env.BASE_PATH + 'users');
        }
  })
  .catch((err) =>
  {
    console.error(err);
    next(err);
  });
};

/**
 * GET /account/unlink/:provider
 * Unlink OAuth provider.
 */
exports.getOauthUnlink = (req, res, next) => {
  const userInfo = extractUserInfo(req, res);

  const provider = req.params.provider;
  User.findById(userInfo.id, (err, user) => {
    if (err) { return next(err); }
    user[provider] = undefined;
    user.tokens = user.tokens.filter(token => token.kind !== provider);
    user.save((err) => {
      if (err) { return next(err); }
      req.flash('info', { msg: `${provider} account has been unlinked.` });
      res.redirect(process.env.BASE_PATH + 'account/' + userInfo.url);
    });
  });
};

/**
 * GET /reset/:token
 * Reset Password page.
 */
exports.getReset = (req, res, next) => {
  if (req.isAuthenticated()) {
    return res.redirect(process.env.BASE_PATH + '');
  }
  User
    .findOne({ passwordResetToken: req.params.token })
    .where('passwordResetExpires').gt(Date.now())
    .exec((err, user) => {
      if (err) { return next(err); }
      if (!user) {
        Alert.flash(req, 'Password reset token is invalid or has expired.');
        return res.redirect(process.env.BASE_PATH + 'forgot');
      }
      res.render('account/reset', {
        title: 'Password Reset'
      });
    });
};

/**
 * POST /reset/:token
 * Process the reset password request.
 */
exports.postReset = (req, res, next) => {
  req.assert('password', 'Password must be at least 4 characters long.').len(4);
  req.assert('confirm', 'Passwords must match.').equals(req.body.password);

  const errors = req.validationErrors();

  if (errors) {
    Alert.flash(req, errors);
    return res.redirect('back');
  }

  async.waterfall([
    function (done) {
      User
        .findOne({ passwordResetToken: req.params.token })
        .where('passwordResetExpires').gt(Date.now())
        .exec((err, user) => {
          if (err) { return next(err); }
          if (!user) {
            Alert.flash(req, 'Password reset token is invalid or has expired.');
            return res.redirect('back');
          }
          user.password = req.body.password;
          user.passwordResetToken = undefined;
          user.passwordResetExpires = undefined;
          user.save((err) => {
            if (err) { return next(err); }
            req.logIn(user, (err) => {
              done(err, user);
            });
          });
        });
    },
    function (user, done) {
      const transporter = nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USER,
          pass: process.env.SENDGRID_PASSWORD
        }
      });
      const mailOptions = {
        to: user.email,
        from: 'intellimedia@ncsu.edu',
        subject: 'Your Guide password has been changed',
        text: `Hello,\n\nThis is a confirmation that the password for your account ${user.email} has just been changed.\n`
      };
      transporter.sendMail(mailOptions, (err) => {
        req.flash('success', { msg: 'Success! Your password has been changed.' });
        done(err);
      });
    }
  ], (err) => {
    if (err) { return next(err); }
    res.redirect(process.env.BASE_PATH + '');
  });
};

/**
 * GET /forgot
 * Forgot Password page.
 */
exports.getForgot = (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect(process.env.BASE_PATH + '');
  }
  res.render('account/forgot', {
    title: 'Forgot Password'
  });
};

/**
 * POST /forgot
 * Create a random token, then the send user an email with a reset link.
 */
exports.postForgot = (req, res, next) => {
  req.assert('email', 'Please enter a valid email address.').isEmail();
  req.sanitize('email').normalizeEmail({ remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    Alert.flash(req, errors);
    return res.redirect(process.env.BASE_PATH + 'forgot');
  }

  async.waterfall([
    function (done) {
      crypto.randomBytes(16, (err, buf) => {
        const token = buf.toString('hex');
        done(err, token);
      });
    },
    function (token, done) {
      User.findOne({ email: req.body.email }, (err, user) => {
        if (!user) {
          Alert.flash(req, 'Account with that email address does not exist.');
          return res.redirect(process.env.BASE_PATH + 'forgot');
        }
        user.passwordResetToken = token;
        user.passwordResetExpires = Date.now() + 3600000; // 1 hour
        user.save((err) => {
          done(err, token, user);
        });
      });
    },
    function (token, user, done) {
      const transporter = nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USER,
          pass: process.env.SENDGRID_PASSWORD
        }
      });
      const mailOptions = {
        to: user.email,
        from: 'intellimedia@ncsu.edu',
        subject: 'Reset your password on Guide',
        text: `You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n
          Please click on the following link, or paste this into your browser to complete the process:\n\n
          http://${req.headers.host}/reset/${token}\n\n
          If you did not request this, please ignore this email and your password will remain unchanged.\n`
      };
      transporter.sendMail(mailOptions, (err) => {
        req.flash('info', { msg: `An e-mail has been sent to ${user.email} with further instructions.` });
        done(err);
      });
    }
  ], (err) => {
    if (err) { return next(err); }
    res.redirect(process.env.BASE_PATH + 'forgot');
  });
};
