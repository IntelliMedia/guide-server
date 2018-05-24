'use strict'

class BKTEvaluator {
	constructor(bktParametersRepository) {
        this.bktParametersRepository = bktParametersRepository; 
    }

    getL0(conceptId) {
        return this.bktParametersRepository.findParameters(conceptId).L0;
    }

    update(conceptId, isCorrect, Ln) {

        let parameters = this.bktParametersRepository.findParameters(conceptId);

        if (Ln == undefined) {
            Ln = parameters.L0;
        }

        let pGivenEvidence = isCorrect ? this._pLnGivenCorrect(parameters, Ln) : this._pLnGivenIncorrect(parameters, Ln);

        // P(Ln) = P(Ln-1 |evidencen-1) + ((1 - P(Ln-1 |evidencen-1)) · P(T))
        Ln = pGivenEvidence + ((1 - pGivenEvidence) * parameters.T);

        return Ln;
    }

    _pLnGivenCorrect(parameters, Ln) {
        // P(Ln |correctn) = (P(Ln)· (1−P(S)))  / P(correctn)
        return (Ln * (1 - parameters.S)) / this._pCorrect(parameters, Ln);
    }

    _pLnGivenIncorrect(parameters, Ln) {
        // P(Ln |correctn) = (P(Ln)· (1−P(S)))  / P(correctn)
        return (Ln * parameters.S) / this._pIncorrect(parameters, Ln);
    }


    _pCorrect(parameters, Ln) {
        // P(correct n) = P(Ln) · (1−P(S)) + (1−P(Ln)) · P(G)
        return Ln * (1 - parameters.S) + (1 - Ln) * parameters.G;
    }

    _pIncorrect(parameters, Ln) {
        // P(incorrectn) = (P(Ln) · P(S)) + ((1−P(Ln)) · (1−P(G)))
        return (Ln * parameters.S) + ((1 - Ln) * (1 - parameters.G));
    }
}

module.exports = BKTEvaluator;