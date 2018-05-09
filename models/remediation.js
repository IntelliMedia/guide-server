'use strict';

class Remediation {   
    constructor(source, id, priority, conceptId, minimumAttempts, scoreThreshold, tags, practiceCriteria) {
        this.source = source;
        this.id = id;
        this.priority = priority;
        this.conceptId = conceptId;
        this.minimumAttempts = minimumAttempts;
        this.scoreThreshold = scoreThreshold;
        this.tags = tags;
        this.practiceCriteria = practiceCriteria;

        if (!this.practiceCriteria) {
            //throw new Error("No PracticeCriteria defined for concept.")
        }
    }

    sourceUrl() {
        return this.source + '/edit#gid=0?range=' + this.id + ':' + this.id;
    }
}

module.exports = Remediation;