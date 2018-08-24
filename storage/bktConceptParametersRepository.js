'use strict';

const Stringx = require("../utilities/stringx");
const Alert = require("../models/Alert");

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

        let err = new Error("BKT parameters not defined for conceptId: " + conceptId + "\n   Source: " +
        GoogleSheetRepository.sourceAsUrl(this.objs[0]));

        for(let conceptParameters of this.objs) {
            if (conceptParameters.conceptId === "DEFAULT") {
                Alert.error(err);
                return conceptParameters;
            }
        }

        throw err;
    }
}

module.exports = BKTConceptParametersRepository;