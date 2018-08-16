'use strict';

const _ = require('lodash');

/**
 * Base class for data storage
 */
class Repository {
    constructor() {
        this.objs = [];
    }

    // Add objects to repo
    insert(objArray) {
        if (!(objArray instanceof Array)) {
            throw new Error("objArray is not an Array");
        }
        this.objs = this.objs.concat(objArray);
    }

    // Load a collection of objects into the repository 
    loadCollectionAsync(collectionId, bypassCache) {
       throw new Error("Not implemented");
    }

    // Load multiple collections of objects into the repository 
    loadCollectionsAsync(collectionIds, bypassCache) {
        if (!(collectionIds instanceof Array)) {
            throw new Error("collectionIds is not an Array");
        }

        let loadPromises = [];
        collectionIds.forEach((id) => {
            loadPromises.push(this.loadCollectionAsync(id, bypassCache));
        });

        return Promise.all(loadPromises);
    }    

    // Find objects loaded into the repository that have
    // these tags. If tag is undefined, all objects will 
    // be returned.
    filter(tags) {

            // targets must include all tags
            let targetTags = (tags ? tags.splitAndTrim(",") : []);

            var matchingObjs = this.objs.filter(function(item) {
                let repoTags = item.hasOwnProperty("tags") ? item.tags.splitAndTrim(",") : [];
                return _.difference(targetTags, repoTags).length === 0;
            }); 

            return matchingObjs;
    }
}

module.exports = Repository;