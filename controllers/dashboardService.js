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

    updateStudentDataAsync(studentModel, pathToUserITSData) { 

      try {
          let data = {
              "studentModel": {
                "conceptsAggregated": this._filterConceptsAggregated(studentModel.conceptsAggregated),
                "conceptsByChallenge": this._convertConceptsByChallengeToProperties(studentModel.conceptsByChallenge),
                "traitScores": this._averageConceptScoreByTrait(studentModel.conceptsByTrait)
              }
            };

          //console.info("Push this to firebase:\n" + JSON.stringify(data, null, 2));
          
          console.info("Update LearnPortal");
          let ref = firebaseDb.ref(pathToUserITSData);
          return ref.set(data);

        } catch(err) {
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
          concepts[conceptByChallenge.challengeId] = conceptByChallenge.concepts;
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