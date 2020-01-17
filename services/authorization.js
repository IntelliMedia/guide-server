const nodeAcl = require('acl');

/**
 * Access Control List
 * Initialized after database connection is established.
 * See https://github.com/OptimalBits/node_acl
 */
exports.acl = null;

exports.initialize = (dbc, cb) => {
    exports.acl = new nodeAcl(new nodeAcl.mongodbBackend(dbc.db, "acl"));

    initializeRoles();

    cb();
};

exports.getIsAllowed = (user, cb) => {

  if (!user) {
    cb(function(resource, permissions) {
      return false;
    }, null);

    return null;
  }

  // Get all roles this user has
  exports.acl.userRoles(user.id).then((roles) => {
    return exports.acl._rolesResources(roles);
  })
  // Get all permissions associated with roles
  .then((resources) => {
    return exports.acl.allowedPermissions(user.id, resources);
  })
  // Return function that checks resource/permissions
  .then((permissions) =>
  {
    var isAllowedFunc = function(resource, requestedPermission) {
        return (permissions[resource]
          && (permissions[resource].indexOf(requestedPermission) >= 0 || permissions[resource].indexOf('*') >= 0));
    }

    cb(isAllowedFunc, null);
    return null;
  })
  .catch((err) =>
  {
    console.error(err);
    cb(null, err);
  });

  // isAllowed function is returned via callback
  return null;
};

function initializeRoles() {

    // Define roles, resources and permissions
    exports.acl.allow([
      {
          roles:['administrator'],
          allows:[
              {resources:['users', 'audits'], permissions:['get', 'post']},
              {resources:['account+roles','roles'], permissions:['get', 'post']},
              {resources:['groups', 'group', 'students', 'students+delete', 'student', 'student+delete', 'sessions', 'sessions+delete'], permissions:['get', 'post', 'delete']},
              {resources:['classes', 'session', 'tools', 'alerts', 'api'], permissions:['get', 'post', 'delete']}
          ]
      },
      {
          roles:['researcher'],
          allows:[
              {resources:['groups', 'group', 'students', 'student', 'sessions', 'tools'], permissions:['get', 'post']},
              {resources:['classes', 'session', 'alerts', 'api'], permissions:['get']}
          ]
      }
    ], (err) => {
      if (err) {
        console.error(err);
        throw err;
      }
    });
}

/**
 * Override ACL middleware() function to change the way URLs are
 * identified as 'resources' since we want to avoid '/' in resource name
 * because mongodb fails to backup/dump when collection names have a slash.
 */
exports.middleware = function(numPathComponents, userId, actions) {

  var acl = this;

  function HttpError(errorCode, msg){
    this.errorCode = errorCode;
    this.message = msg;
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
    this.constructor.prototype.__proto__ = Error.prototype;
  }

  return function(req, res, next){
    var _userId = userId,
        _actions = actions,
        resource,
        url;

    // call function to fetch userId
    if(typeof userId === 'function'){
      _userId = userId(req, res);
    }
    if (!userId) {
      if((req.session) && (req.session.userId)){
        _userId = req.session.userId;
      }else if((req.user) && (req.user.id)){
        _userId = req.user.id;
      }else{
        next(new HttpError(401, 'User not authenticated'));
        return;
      }
    }

    // Issue #80 - Additional check
    if (!_userId) {
      next(new HttpError(401, 'User not authenticated'));
      return;
    }

    url = req.originalUrl.replace(process.env.BASE_PATH, '/').split('?')[0];
    if(!numPathComponents){
      resource = url;
    }else{
      resource = url.split('/').slice(0,numPathComponents+1).join('/');
    }

    if(!_actions){
      _actions = req.method.toLowerCase();
    }

    // Remove slashes from resource since these require more ACL resources to be defined (e.g.
    // "/users" and "user") and the slash causes mongodump to fail because slash can't be part
    // of collection name created by ACL.
    // Remove leading/trailing slashes and replace inner slash with '+'
    resource = resource.replace(/(^\/)|(\/$)/g, "").replace("/", "+");

    acl.logger?acl.logger.debug('Requesting '+_actions+' on '+resource+' by user '+_userId):null;

    exports.acl.isAllowed(_userId, resource, _actions, function(err, allowed){
      if (err){
        next(new Error('Error checking permissions to access resource'));
      }else if(allowed === false){
        if (acl.logger) {
          acl.logger.debug('Not allowed '+_actions+' on '+resource+' by user '+_userId);
          acl.allowedPermissions(_userId, resource, function(err, obj){
            acl.logger.debug('Allowed permissions: '+util.inspect(obj));
          });
        }
        next(new HttpError(403,'Insufficient permissions to access resource'));
      }else{
        acl.logger?acl.logger.debug('Allowed '+_actions+' on '+resource+' by user '+_userId):null;
        next();
      }
    });
  };
};

exports.Middleware = (numPathComponents, userId, actions) => {
  return function(req, res, next) {
    if (!req.hasOwnProperty("user")) {
      res.status(403);
      next('Permission denied: User not signed in.');
      return;
    }

    var userId = req.user.id;

    var handler;
    if (actions) {
       handler = exports.acl.middleware(numPathComponents ? numPathComponents : Number.MAX_SAFE_INTEGER, userId, actions);
    }
    else {
       handler = exports.acl.middleware(numPathComponents ? numPathComponents : Number.MAX_SAFE_INTEGER, userId);
    }

    handler(req, res, next);
  }
};

/**
 * Check permissions for accessing user resource
 */
exports.usersMiddleware = (numPathComponents, userId, actions) => {

  function HttpError(errorCode, msg){
    this.errorCode = errorCode;
    this.message = msg;
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
    this.constructor.prototype.__proto__ = Error.prototype;
  }

  return function(req, res, next) {

    var _userId = req.user.id;
    var _resource = "users";
    var _actions = actions;
    if(!_actions){
      _actions = req.method.toLowerCase();
    }

    exports.acl.isAllowed(_userId, _resource, _actions, function(err, allowed){

      // If editing your own user resource, you automatically have permission
      const editedUserId = (req.params.userId ? req.params.userId : _userId);
      var userOwnsResource = true; //(editedUserId == _userId);

      if (err){
        next(new Error('Error checking permissions to access resource'));
      }else if(allowed === false && userOwnsResource == false){
        if (acl.logger) {
          exports.acl.logger.debug('Not allowed '+_actions+' on '+_resource+' by user '+_userId);
          exports.acl.allowedPermissions(_userId, _resource, function(err, obj){
            exports.acl.logger.debug('Allowed permissions: '+util.inspect(obj));
          });
        }
        next(new HttpError(403,'Insufficient permissions to access resource'));
      }else{
        exports.acl.logger?acl.logger.debug('Allowed '+_actions+' on '+_resource+' by user '+_userId):null;
        next();
      }
    });
  }
};