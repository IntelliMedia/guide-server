'use strict';

const RulesRepository = require('../storage/rulesRepository');
const RuleCondition = require('../models/ruleCondition');
const StudentModelService = require('./studentModelService');
const Group = require('../models/Group');
const TutorAction = require('../models/TutorAction');
const stringx = require("../utilities/stringx");
const DashboardService = require('./dashboardService');
const Biologica = require('../shared/biologica');
const Biologicax = require('../shared/biologicax');
const _ = require('lodash');

/**
 * This class uses ECD-derived rules to evaluate student moves
 * and to provide move-specific hints.
 */
class Evaluator {
    constructor() {
        this.rulesRepository = new RulesRepository(global.cacheDirectory);
        this.studentModelService = new StudentModelService();
        this.ruleSetIds = [];
    }

    initializeAsync(session, groupName, tags) {
        return Group.findOne({ "name": groupName }).then((group) => {
            if (!group) {
                throw new Error("Unable to find group with name: " + groupName);
            }

            let ids = group.getCollectionIds(tags);
            
            this.ruleSourceUrls = ids.map((id) => {
                return this.rulesRepository.getGoogleSheetUrl(id);
            });

            if (ids.length == 0) {
                session.warningAlert("No rules sheets specified for [" + tags + "] in '" + groupName + "' group.");
            }

            return this.rulesRepository.loadCollectionsAsync(ids, group.cacheDisabled);
        })
        .then(() => this.studentModelService.initializeAsync(groupName));
    }    

    evaluateAsync(student, session, event) {
        return Promise.resolve(true);
    }
}

module.exports = Evaluator;