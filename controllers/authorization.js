const nodeAcl = require('acl');

/**
 * Access Control List
 * Initialized after database connection is established.
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

    return;
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
  })
  .catch((err) =>
  {
    cb(null, err);
  })
};

function initializeRoles() {

    // Define roles, resources and permissions
    exports.acl.allow([
      {
          roles:['administrator'],
          allows:[
              {resources:['/users','users'], permissions:'*'},
              {resources:['/account/roles','roles'], permissions:'*'},
              {resources:['/monitor','monitor','/session','session','/alerts','alerts','/students','students','/student','student','/api','api'], permissions:'*'}
          ]
      },
      {
          roles:['researcher'],
          allows:[
              {resources:['/monitor','monitor','/session','session','/alerts','alerts','/students','students','/student','student','/api','api'], permissions:'*'}
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
    if (!userId) {
      userId = req.user.id;
    }

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