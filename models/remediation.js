'use strict';

class Remediation {   
    constructor(source, id, priority, conceptId, minimumAttempts, probabilityLearnedThreshold, tags, practiceCriteria) {
        this.source = source;
        this.id = id;
        this.priority = priority;
        this.conceptId = conceptId;
        this.minimumAttempts = minimumAttempts;
        this.probabilityLearnedThreshold = probabilityLearnedThreshold;
        this.tags = tags;
        this.practiceCriteria = practiceCriteria;

        if (!this.practiceCriteria) {
            //throw new Error("No PracticeCriteria defined for concept.")
        }
    }
}

module.exports = Remediation;