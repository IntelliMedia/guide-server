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
  let cmd = args[0];
  if (cmd === "--learn-bkt-params") {
    let googleDocId = args[1];
    let mongoDbUri = args[2];
    if (mongoDbUri) {
      process.env.MONGODB_URI = mongoDbUri;
    }
    learnParameters(googleDocId);
  } else {
    throw new Error("Unknown command: " + cmd);
  }
} catch(err) {
  console.error("Command failed", err);
  console.info("Usage: npm run learn-bkt-params <Google Sheet ID> [<MongoDB URI>]")
  console.info("Example: npm run learn-bkt-params 1qxVydWFBTPejUl9KzjBhhOJ0pS4SZt9wMYi5_wbOq9k mongodb://localhost/guide3")
}

function learnParameters(docId) {
  if (!docId) {
    throw new Error("Google Sheet Doc ID is blank");
  }

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
  .then((parameterLearner) => {
      let datetime = parameterLearner.startTime.toFilename();
      // Write to parameters CSV file
      let filename = 'bkt-parameters-' + (datetime + ".csv");
      let outfile = path.resolve(__dirname, filename);
      fs.writeFileSync(outfile, parameterLearner.outputCsv);
      console.log(`Generated: ${outfile}`);

      // Write stats to CSV file
      filename = 'bkt-learning-stats-' + (datetime + ".csv");
      outfile = path.resolve(__dirname, filename);
      fs.writeFileSync(outfile, parameterLearner.statsCsv);
      console.log(`Generated: ${outfile}`); 
  })
  .catch((err) => {
    console.error(err);
  });
}