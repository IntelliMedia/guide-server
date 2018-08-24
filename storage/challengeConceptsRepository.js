'use strict';

const ChallengeConceptsCsvDeserializer = require("./challengeConceptsCsvDeserializer");
const GoogleSheetRepository = require("./googleSheetRepository");

/**
 * This class loads the challenge to concept mapping from storage
 */
class ChallengeConceptsRepository extends GoogleSheetRepository {
    constructor(cacheDirectory) {
        super(cacheDirectory, new ChallengeConceptsCsvDeserializer());
    }
}

module.exports = ChallengeConceptsRepository;