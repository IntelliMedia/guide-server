const User = require('../models/User');
const authz = require('../services/authorization');
const paginate = require('express-paginate');
const MongoQS = require('mongo-querystring');

exports.index = (req, res) => {
  var qs = new MongoQS();
  let filter = qs.parse(req.query);

  let users;
  var roleMap = [];
  let itemCount = 0;
  User.count(filter)
    .then((resultsCount) => {
        itemCount = resultsCount;
        return User.find(filter).sort({email: 0}).limit(req.query.limit).skip(req.skip).exec();
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