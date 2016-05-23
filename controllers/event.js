"use strict";

const _ = require('lodash');
const async = require('async');
const validator = require('validator');
const request = require('request');

exports.handleEvent = (req, res, next) => {
  console.info("Received:" + req);
  res.json({"status": "OK"});
};
