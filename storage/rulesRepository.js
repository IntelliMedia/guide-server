'use strict';

const RuleCsvDeserializer = require("./ruleCsvDeserializer");
const GoogleSheetRepository = require("./googleSheetRepository");

/**
 * This class loads rules from storage
 */
class RulesRepository extends GoogleSheetRepository {
    constructor(cacheDirectory) {
        super(cacheDirectory, new RuleCsvDeserializer());
    }
}

module.exports = RulesRepository;