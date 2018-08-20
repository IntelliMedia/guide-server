'use strict';

const AttributeConceptsCsvDeserializer = require("./attributeConceptsCsvDeserializer");
const GoogleSheetRepository = require("./googleSheetRepository");

/**
 * This class loads the attribute to concept mapping from storage
 */
class AttributeConceptsRepository extends GoogleSheetRepository {
    constructor(cacheDirectory) {
        super(cacheDirectory, new AttributeConceptsCsvDeserializer());
    }
}

module.exports = AttributeConceptsRepository;