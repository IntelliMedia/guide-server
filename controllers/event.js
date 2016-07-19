"use strict";

const _ = require('lodash');
const async = require('async');
const validator = require('validator');
const request = require('request');

exports.handleEventV1 = (req, res, next) => {
  console.info("Received on " + req.originalUrl + ":" + req);
  res.json({"status": "OK"});
};

exports.handleEventV2 = (req, res, next) => {
  console.info("Received " + req.originalUrl + ":" + req);
  res.json({"status": "OK"});
};
