'use strict';

const Stringx = require("../utilities/stringx");

const BKTConceptParametersCsvDeserializer = require("./bktConceptParametersCsvDeserializer");
const GoogleSheetRepository = require("./googleSheetRepository");

/**
 * This class loads BKT parameters for concepts from storage
 */
class BKTConceptParametersRepository extends GoogleSheetRepository {
    constructor(cacheDirectory) {
        super(cacheDirectory, new BKTConceptParametersCsvDeserializer());
    }

    findParameters(conceptId) {
        if (this.objs.length == 0) {
            throw new Error("No BKT parameters have been loaded.");
        }

        for(let conceptParameters of this.objs) {
            if (conceptParameters.conceptId === conceptId) {
                return conceptParameters;
            }
        }

        throw new Error("BKT parameters not defined for conceptId: " + conceptId + "\n   Source: " +
            GoogleSheetRepository.sourceAsUrl(this.objs[0]));
    }
}

module.exports = BKTConceptParametersRepository;