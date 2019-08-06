"use strict";

/**
 * Setup global promise lib
 */
require('bluebird');

const dotenv = require('dotenv');
const BKTParameterLearner = require("./services/bktParameterLearner");
const StudentIdsRepository = require("./storage/studentIdsRepository");
const path = require('path');
const fs = require('fs');
const datex = require('./utilities/datex');

if (process.env.DISABLE_DEBUG_LOG == "true") {
  console.info("Console log disabled");
  console.log = () => {};
}

var guideInfo = require('./package');
console.info("%s %s", guideInfo.name, guideInfo.version);

/**
 * Configuration Variables
 */
global.cacheDirectory = "./data/cache";

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
let envFilename;
switch (process.env.NODE_ENV) {
  case 'production':
    envFilename = 'private/env.production';
    break;

  case 'staging':
    envFilename = 'private/env.staging';
    break;

  case 'development':
    envFilename = 'private/env.development';
    break;

  default:
    envFilename = '.env.example';
}

// set GUIDE_CONFIGURED to use preset environment variables
// rather than configuring the environment from local files.
if (!process.env.GUIDE_ENV_CONFIGURED) {
  dotenv.load({ path: envFilename });
  console.info('Server configured using: ' + envFilename);
}

/**
 * Configure the path where the web app is located
 */
if (!process.env.BASE_PATH) {
  process.env.BASE_PATH = '/';
}

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is not defined. Specify database in environment file.")
}

try {
  // Normalize args by dropping node <script name> and leaving arg0 arg1 arg2...
  var args = process.argv.slice(3);

  if (args[0] === "--learn-bkt-params") {
    learnParameters(args[1]);
  } else {
    throw new Error("Unknown command: " + args[0]);
  }
} catch(err) {
  console.error("Command failed", err);
}

function learnParameters(docId) {
  if (!docId) {
    throw new Error("Google Sheet Doc ID is blank");
  }

  let begin=Date.now();
  let studentIdsRepository = new StudentIdsRepository();
  studentIdsRepository.loadCollectionAsync(docId, true)
  .then((studentIds) =>
  { 
    if (!studentIds || studentIds.length == 0) {
      throw new Error("Unable to find student IDs in Google Sheet: " + docId);
    }
    let parameterLearner = new BKTParameterLearner(); 
    return parameterLearner.runAsync(studentIds);
  })
  .then((csv) => {
      // Write to tmp directory
      let filename = 'bkt-parameters-' + (new Date()).toFilename() + ".csv";
      let outfile = path.resolve(__dirname, filename);
      fs.writeFileSync(outfile, csv);
      console.log(`Generated: ${outfile}`);
  })
  .catch((err) => {
    console.error(err);
  })
  .finally(() => {
    let end= Date.now();
    let timeSpent=(end-begin)/1000;
    console.info("Run time: %f seconds", timeSpent);
  });
}