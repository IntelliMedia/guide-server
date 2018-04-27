'use strict';

const ConceptHintsCsvDeserializer = require("./conceptHintsCsvDeserializer");
const GoogleSheetRepository = require("./googleSheetRepository");

/**
 * This class loads concept hints from storage
 */
class ConceptHintsRepository extends GoogleSheetRepository {
    constructor(cacheDirectory) {
        super(cacheDirectory, new ConceptHintsCsvDeserializer());
    }
}

module.exports = ConceptHintsRepository;