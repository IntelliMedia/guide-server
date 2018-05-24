'use strict';

const BKTEvaluator = require('./bktEvaluator');
const BKTConceptParametersRepository = require('../storage/bktConceptParametersRepository');
const Student = require('../models/Student');
const Group = require('../models/Group');
const StudentModel = require('../models/StudentModel');
const ConceptObservation = require('../models/ConceptObservation');

/**
 * This class takes raw rule results and updates a student's StudentModel
 * and records concept changes.
 */
class StudentModelService {
    constructor() {
        this.bktEvaluator = null;
    }

    initializeAsync(groupName) {
        let parameterRepo = new BKTConceptParametersRepository(global.cacheDirectory)
        this.bktEvaluator = new BKTEvaluator(parameterRepo);

        let tags = "bkt-parameters";
        return Group.getCollectionIdsAsync(groupName, tags).then((ids) => {
            if (ids.length == 0) {
                throw new Error("Unable to find Google Sheet with tags (" + tags + ") in  group '" + groupName + "'");
            }

            return parameterRepo.loadCollectionsAsync(ids);
        });
    }  
    
    updateDashboardAsync(student, session) {
        if (student.learnPortalEndpoint) {
            let dashboardService = new DashboardService();
            return dashboardService.updateStudentDataAsync(session, student.studentModel, student.learnPortalEndpoint)
                .then(() => {
                    return true;
                })
                .catch((err) => {
                    // It's ok for the dashboard push to fail, we should continue to return an action
                    return false;
                });
        }
        else
        {
            return Promise.resolve(true);
        }          
    }

    processConceptDataPoint(student, conceptId, isCorrect, challengeId, attribute, substitutionVariables, timestamp, source) {

        let observation = ConceptObservation.record(timestamp, conceptId, attribute, student.id, challengeId, isCorrect);
     
        let conceptState = student.studentModel.getBktConceptState(conceptId, this.bktEvaluator.getL0(conceptId));
        conceptState.probabilityLearned = this.bktEvaluator.update(conceptId, isCorrect, conceptState.probabilityLearned);
        if (isCorrect) {
            conceptState.totalCorrect++;
        }
        conceptState.totalAttempts++;
        conceptState.timestamp = timestamp;

        if (isCorrect != true) {
            student.studentModel.addMisconception(conceptId, challengeId, attribute, substitutionVariables, timestamp, source);
        }

        return observation;
    }
}

module.exports = StudentModelService;