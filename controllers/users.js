const consolex = require('../utilities/consolex');
const User = require('../models/User');
const authz = require('./authorization');

exports.index = (req, res) => {
  User.find({}, function(err, users) {
      if (err) throw err;
    
      // object of all the users
      console.log(users);

      var roleMap = [];
      var promises = [];
      users.forEach((user) => {
        promises.push(authz.acl.userRoles(user.id).then((roles) => {
          roleMap[user.id] = roles;
        }));
      });

      Promise.all(promises).then(() => {
        res.render('users', {
          title: 'Users',    
          users: users,
          roleMap: roleMap  
        });
      })
      .catch((err) =>
      {
        consolex.exception(err);
        if (err) throw err;
      }); 
  });    
};