'use strict';

class BKTConceptParameters {   
    constructor(source, id, conceptId, L0, G, S, T) {
        this.source = source;
        this.id = id;
        this.conceptId = conceptId;
        this.L0 = L0;
        this.G = G;
        this.S = S;
        this.T = T;
    }
}

module.exports = BKTConceptParameters;