const consolex = require('../utilities/consolex');
const nodeAcl = require('acl');

/**
 * Access Control List
 * Initialized after database connection is established.
 * See https://github.com/OptimalBits/node_acl
 */
exports.acl = null;

exports.initialize = (dbc, cb) => {
    exports.acl = new nodeAcl(new nodeAcl.mongodbBackend(dbc.connection.db, "acl"));

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
    consolex.exception(err);
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
              {resources:['/users','users'], permissions:['get', 'post']},
              {resources:['/account/roles','roles'], permissions:['get', 'post']},
              {resources:['/groups','/group','groups', 'group'], permissions:['get', 'post', 'delete']},
              {resources:['/sessions','sessions','/session','session','/alerts', '/alerts/clear','alerts','/students','students','/student','student','/api','api'], permissions:['get', 'post', 'delete']}
          ]
      },
      {
          roles:['researcher'],
          allows:[
              {resources:['/groups','/group','groups', 'group'], permissions:['get', 'post']},
              {resources:['/sessions','sessions','/session','session','/alerts','alerts','/students','students','/student','student','/api','api'], permissions:['get']}
          ]
      }
    ], (err) => {
      if (err) { 
        console.log(err);
        throw err; 
      }     
    });
}

/**
 * Override ACL middleware() function since it expects the user.id to be in
 * the session. The latest code on GitHub includes user.id check, but the
 * NPM package does not (as of 2016-07-14). Once ACL NPM package is updated
 * This function can be replaced with a simple call to exports.acl.middleware().
 */
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