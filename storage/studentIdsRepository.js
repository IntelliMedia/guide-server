'use strict';

const GenericCsvDeserializer = require("./genericCsvDeserializer");
const GoogleSheetRepository = require("./googleSheetRepository");

/**
 * This class loads student IDs from storage
 */
class StudentIdsRepository extends GoogleSheetRepository {
    constructor() {
        super(global.cacheDirectory, new GenericCsvDeserializer(["StudentId"]));
    }
}

module.exports = StudentIdsRepository;