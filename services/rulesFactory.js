'use strict';

const Group = require('../models/Group');
const RulesRepository = require('../storage/rulesRepository');
const AttributeConceptsRepository = require('../storage/attributeConceptsRepository');
const AttributeRule = require('../models/attributeRule');
const MoveRule = require('../models/moveRule');
const BreedingRule = require('../models/breedingRule');

/**
 * This class creates rules of specific types
 */
class RulesFactory {
    constructor() {
        this.attributeConcepts = null;
    }

    createRulesForEventAsync(session, event) {
        
        let groupName = session.groupId;
        let speciesName = event.context.species;

        let legacy = false;

        if (legacy) {
            let evaluatorTags = event.action.toLowerCase() + ", " + event.target.toLowerCase();
            return this._loadRulesFromSheetAsync(session, session.groupId, evaluatorTags);
        } else {

        if (event.isMatch('USER', 'SUBMITTED', 'ORGANISM')
         || event.isMatch('USER', 'SUBMITTED', 'EGG')) {
            return this._loadAttributeConceptsAsync(session, groupName, speciesName)
                .then(() => this._createOrganismMatchRules(speciesName));
        } else if (event.isMatch('USER', 'CHANGED', 'ALLELE')
                || event.isMatch('USER', 'SELECTED', 'GAMETE')) {
            return this._loadAttributeConceptsAsync(session, groupName, speciesName)
                .then(() => this._createOrganismChangedRules(speciesName));
        } else if (event.isMatch('USER', 'BRED', 'CLUTCH')) {
            return this._loadAttributeConceptsAsync(session, groupName, speciesName)
                .then(() => this._createBreedingRules(speciesName));
        } else {
            let evaluatorTags = event.action.toLowerCase() + ", " + event.target.toLowerCase();
            return this._loadRulesFromSheetAsync(session, session.groupId, evaluatorTags);
        }
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

    }

    _loadAttributeConceptsAsync(session, groupName, speciesName) {
        if (this.attributeConcepts != null) {
            return Promise.accept();
        } else {
            let attributeConceptsRepository;
            return Group.findOne({ "name": groupName }).then((group) => {
                if (!group) {
                    throw new Error("Unable to find group with name: " + groupName);
                }

                let tags = speciesName.toLowerCase() + ", attribute-concepts";
                let ids = group.getCollectionIds(tags);
                
                if (ids.length == 0) {
                    session.warningAlert("Unable to find attribute concepts sheet for [" + tags + "] defined in '" + groupName + "' group");
                }

                attributeConceptsRepository = new AttributeConceptsRepository(global.cacheDirectory);
                return attributeConceptsRepository.loadCollectionsAsync(ids, group.cacheDisabled);
            }).then(() => {
                if (attributeConceptsRepository) {
                    this.attributeConcepts = attributeConceptsRepository.objs;
                }
            })
        }
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

    _createOrganismMatchRules(species) {
        let rules = [];

        let attributes = [...new Set(this.attributeConcepts.map(item => item.attribute))];

        for(let attribute of attributes) {
            let targets = this.attributeConcepts.filter((item) => item.attribute === attribute);
            var targetMap = {};
            for(let target of targets) {
                targetMap[target.target] = target;
            }
    
            let rule = new AttributeRule(
                attribute,
                targetMap);
    
            rules.push(rule);
        }

        return rules;
    }

    _createBreedingRules(species) {
        let rules = [];

        let attributes = [...new Set(this.attributeConcepts.map(item => item.attribute))];

        for(let attribute of attributes) {
            let targets = this.attributeConcepts.filter((item) => item.attribute === attribute);
            var targetMap = {};
            for(let target of targets) {
                targetMap[target.target] = target;
            }
    
            let rule = new BreedingRule(
                attribute,
                targetMap);
    
            rules.push(rule);
        }

        return rules;
    }

    _createOrganismChangedRules(species) {
        let rules = [];

        let attributes = [...new Set(this.attributeConcepts.map(item => item.attribute))];

        for(let attribute of attributes) {
            let targets = this.attributeConcepts.filter((item) => item.attribute === attribute);
            var targetMap = {};
            for(let target of targets) {
                targetMap[target.target] = target;
            }
    
            let rule = new MoveRule(
                attribute,
                targetMap);
    
            rules.push(rule);
        }

        return rules;
    }

    static CreateBreedRule(species, trait) {

    }

    static CreateParentChangeRule(species, trait) {

    }
}

module.exports = RulesFactory;