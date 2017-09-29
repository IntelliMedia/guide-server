'use strict';

const firebase = require("firebase-admin");
const serviceAccount = require("../private/GVDemo-a034f68fba6f.json"); 

// Singletons so that we don't have to reinitilize this each time
let firebaseApp = null;
let firebaseDb = null;

/**
 * This class uploads summary information from the ITS student model
 * to the Learn Portal for display in the teacher dashboard
 */
class LearnPortalService {
    constructor() {
        if (firebaseApp == null) {
            console.info("Initialize connection to Firebase");
            let learnPortalCredential = firebase.credential.cert(serviceAccount);
            firebaseApp = firebase.initializeApp({
                credential: learnPortalCredential,
                databaseURL: "https://gvdemo-6f015.firebaseio.com"
            }, "LearnPortal");
        }

        if (firebaseApp != null && firebaseDb == null) {
            firebaseDb = firebase.database(firebaseApp);
        }
    }

    updateStudentDataAsync(pathToUserITSData, studentModel) { 

        let data = {
            "studentModel": {
              "traitScores": [
                {
                  "trait": "forelimbs",
                  "score": 0.5
                },
                {
                  "trait": "sex",
                  "score": 1
                },
                {
                  "trait": "hindlimbs",
                  "score": 1
                },
                {
                  "trait": "wings",
                  "score": 1
                }
              ],
              "conceptsByChallenge": {
                "allele-targetMatch-visible-simpleDom": [
                  {
                    "conceptId": "LG1.A3",
                    "totalBottomOutHintsDelivered": 0,
                    "totalHintsDelivered": 0,
                    "totalAttempts": 2,
                    "totalCorrect": 2,
                    "score": 1
                  },
                  {
                    "conceptId": "LG1.C2b",
                    "totalBottomOutHintsDelivered": 0,
                    "totalHintsDelivered": 0,
                    "totalAttempts": 6,
                    "totalCorrect": 5,
                    "score": 0.8333333333333334
                  },
                  {
                    "conceptId": "LG1.C2a",
                    "totalBottomOutHintsDelivered": 0,
                    "totalHintsDelivered": 1,
                    "totalAttempts": 6,
                    "totalCorrect": 5,
                    "score": 0.8333333333333334
                  }
                ]
              },
              "conceptsAggregated": [
                {
                  "conceptId": "LG1.A3",
                  "score": 1
                },
                {
                  "conceptId": "LG1.C2b",
                  "score": 0.8333333333333334
                },
                {
                  "conceptId": "LG1.C2a",
                  "score": 0.8333333333333334
                }
              ]
            }
          };
        console.info("Update LearnPortal");
        //let ref = firebaseDb.ref(pathToUserITSData);
        //return ref.set(data);

        console.info("Push this to firebase:\n" + JSON.stringify(data, null, 2));

        return Promise.resolve();
    }
}

module.exports = LearnPortalService;