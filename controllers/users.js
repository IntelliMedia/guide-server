const User = require('../models/User');
const authz = require('../services/authorization');
const paginate = require('express-paginate');

exports.index = (req, res) => {
  let users;
  var roleMap = [];
  let itemCount = 0;
  User.count({})
    .then((resultsCount) => {
        itemCount = resultsCount;
        return User.find({}).limit(req.query.limit).skip(req.skip).exec();
    })
    .then((results) => {
      users = results;
      var promises = [];
      users.forEach((user) => {
        promises.push(authz.acl.userRoles(user.id).then((roles) => {
          roleMap[user.id] = roles;
        }));
      });

      return Promise.all(promises);
    })
    .then(() => {
        const pageCount = Math.ceil(itemCount / req.query.limit);

        res.render('users', {
          title: 'Users',
          users: users,
          roleMap: roleMap,
          pageCount,
          itemCount,
          pages: paginate.getArrayPages(req)(3, pageCount, req.query.page)
        });
      })
      .catch((err) =>
      {
        console.error(err);
        if (err) throw err;
      });
};