'use strict';

const firebase = require("firebase-admin");
const serviceAccount = require("../private/GVDemo-d6f050998c64.json"); 

// Singletons so that we don't have to reinitilize this each time
let firebaseApp = null;
let firebaseDb = null;

/**
 * This class uploads summary information from the ITS student model
 * to the Learn Portal for display in the teacher dashboard
 */
class DashboardService {
    constructor() {
        if (firebaseApp == null) {
            console.info("Initialize connection to Firebase");
            let learnPortalCredential = firebase.credential.cert(serviceAccount);
            firebaseApp = firebase.initializeApp({
                credential: learnPortalCredential,
                databaseURL: "https://gvdemo-6f015.firebaseio.com"
            }, "Dashboard");
        }

        if (firebaseApp != null && firebaseDb == null) {
            firebaseDb = firebase.database(firebaseApp);
        }
    }

    updateStudentDataAsync(session, studentModel, pathToUserITSData) { 

      let data = null;
      try {
          data = {
              "studentModel": {
                "conceptsAggregated": this._filterConceptsAggregated(studentModel.conceptsAggregated),
                "conceptsByChallenge": this._convertConceptsByChallengeToProperties(studentModel.conceptsByChallenge),
                "traitScores": this._averageConceptScoreByTrait(studentModel.conceptsByTrait)
              }
            };

          //console.info("Push this to firebase:\n" + JSON.stringify(data, null, 2));
          
          session.debugAlert("Set student data in dashboard db; path=" + pathToUserITSData);  
          // Call this promise instead of returning it to run this in parallel since the Firebase DB
          // is taking 60+ seconds for set to return.
          firebaseDb.ref(pathToUserITSData).set(data)
            .then(() => {
              session.debugAlert("Successfully set student data in dashboard db.");
            })
            .catch((err) => {
              session.errorAlert("Unable to set student data in dashboard db: " + err);
            });

          return Promise.resolve();

        } catch(err) {
          console.error("Failed to write this to dashboard:\n"+ JSON.stringify(data, null, 2));
          return Promise.reject(err);
        }
    }

    _filterConceptsAggregated(conceptsAggregated) {
      let concepts = [];
      if (conceptsAggregated) {
        conceptsAggregated.forEach((conceptAggregate) => {
          concepts.push({
            conceptId: conceptAggregate.conceptId,
            score: conceptAggregate.score
          });
        });
      }

      return concepts;
    }

    _convertConceptsByChallengeToProperties(conceptsByChallenge) {
      let concepts = {};
      if (conceptsByChallenge) {
        conceptsByChallenge.forEach((conceptByChallenge) => {
          concepts[conceptByChallenge.challengeId] = conceptByChallenge.concepts.toObject();
        });
      }

      return concepts;
    }

    _averageConceptScoreByTrait(conceptsByTrait) {
      let concepts = [];
      
      if (conceptsByTrait) {
        conceptsByTrait.forEach((current) => {

          let totalCorrect = 0;
          let totalAttempts = 0;

          current.concepts.forEach((concept) => {
            totalCorrect += concept.totalCorrect;
            totalAttempts += concept.totalAttempts;
          });

          let traitAverageScore = {
            trait: current.trait,
            score: (totalAttempts > 0 ? totalCorrect/totalAttempts : 0)
          };

          concepts.push(traitAverageScore);
        });
      }

      return concepts;
    }
}

module.exports = DashboardService;