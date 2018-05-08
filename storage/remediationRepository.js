'use strict';

const RemediationCsvDeserializer = require("./remediationCsvDeserializer");
const GoogleSheetRepository = require("./googleSheetRepository");

/**
 * This class loads concept hints from storage
 */
class RemediationRepository extends GoogleSheetRepository {
    constructor(cacheDirectory) {
        super(cacheDirectory, new RemediationCsvDeserializer());
    }
}

module.exports = RemediationRepository;