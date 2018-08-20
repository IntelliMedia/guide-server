'use strict';

class AttributeConcepts {   
    constructor(source, id, attribute, target, conceptIds) {
        this.source = source;
        this.id = id;
        this.attribute = attribute;
        this.target = target;
        this.conceptIds = conceptIds;
    }
}

module.exports = AttributeConcepts;