'use strict';

const Group = require('../models/Group');
const RulesRepository = require('../storage/rulesRepository');
const AttributeConceptsRepository = require('../storage/attributeConceptsRepository');

/**
 * This class creates rules of specific types
 */
class RulesFactory {
    constructor() {
        this.attributeConceptsRepository = new AttributeConceptsRepository(global.cacheDirectory);
    }

    createRulesForEventAsync(session, event) {
        let evaluatorTags = event.action.toLowerCase() + ", " + event.target.toLowerCase();
        return this._loadRulesFromSheetAsync(session, session.groupId, evaluatorTags);
        
        // if (event.isMatch('USER', 'CHANGED', 'ALLELE')) {
        //     //evaluator = new Evaluator();
        // } else if (event.isMatch('USER', 'SELECTED', 'GAMETE')) {
        //     //evaluator = new Evaluator();
        // } else if (event.isMatch('USER', 'SUBMITTED', 'ORGANISM')) {
        //     //evaluator = new RulesEvaluator();
        // } else if (event.isMatch('USER', 'SUBMITTED', 'EGG')) {
        //     //evaluator = new OrganismEvaluator();
        // } else if (event.isMatch('USER', 'BRED', 'CLUTCH')) {
        //     //evaluator = new Evaluator();
        // } else if (event.isMatch('USER', 'CHANGED', 'PARENT')) {
        //     //evaluator = new Evaluator();
        // } else if (event.isMatch('USER', 'SELECTED', 'OFFSPRING')) {
        //     //evaluator = new Evaluator();
        // } else if (event.isMatch('USER', 'SUBMITTED', 'PARENTS')) {
        //     //evaluator = new Evaluator();
        // } else {
        //     throw new Error("Unable to find evaluator for event: " + event.toString());
        // }
    }

    initializeAsync(session, groupName, speciesName) {
        let tags = speciesName + ", attributes, concepts";
        return Group.findOne({ "name": groupName }).then((group) => {
            if (!group) {
                throw new Error("Unable to find group with name: " + groupName);
            }

            let ids = group.getCollectionIds(tags);
            
            if (ids.length == 0) {
                session.warningAlert("Unable to find attribute concepts sheet for [" + tags + "] defined in '" + groupName + "' group");
            }

            return this.attributeConceptsRepository.loadCollectionsAsync(ids, group.cacheDisabled);
        });
    } 

    _loadRulesFromSheetAsync(session, groupName, tags) {
        let rulesRepository = new RulesRepository(global.cacheDirectory);
        return Group.findOne({ "name": groupName }).then((group) => {
            if (!group) {
                throw new Error("Unable to find group with name: " + groupName);
            }

            let ids = group.getCollectionIds(tags);
            
            this.ruleSourceUrls = ids.map((id) => {
                return rulesRepository.getGoogleSheetUrl(id);
            });

            if (ids.length == 0) {
                session.warningAlert("No rules sheets specified for [" + tags + "] in '" + groupName + "' group.");
            }

            return rulesRepository.loadCollectionsAsync(ids, group.cacheDisabled);
        })
        .then(() => rulesRepository.objs);
    }   

    static CreateTraitMatchRules(species, trait) {

    }

    static CreateTraitChangeRule(species, trait) {

    }

    static CreateSexMatchRule(species) {

    }

    static CreateSexChangeRule(species) {

    }

    static CreateBreedRule(species, trait) {

    }

    static CreateParentChangeRule(species, trait) {

    }
}

module.exports = RulesFactory;