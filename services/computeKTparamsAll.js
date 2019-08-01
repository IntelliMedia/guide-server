'use strict'

class ComputeKTparamsAll {
	 /** 
	 * This class expects data sorted on Skill and then on Student in the below mentioned format
	 * num		lesson					student			skill		   cell 	right
	 *	1	Z3.Three-FactorZCros2008	student102	META-DETERMINE-DXO	cell	0
	 * */

	constructor() {
		this.students_ = [];// Number of instances
		this.skill_ = [];
		this.right_ = [];
		this.skillends_ = [];//Number of Skills
		this.skillnum = -1;
		this.lnminus1_estimation = false;
		this.bounded = true;
		this.L0Tbounded = false;
	}

	parseBoolean(val) { 
        var falsy = /^(?:f(?:alse)?|no?|0+)$/i;
        return !falsy.test(val) && !!val;
    }

	computelzerot(conceptObservations) {
		let actnum = 0;
		try {
			this.skillnum = -1;
			let prevskill = "FLURG";

			for (let i = 1; i < conceptObservations.length; ++i) {
				let conceptObservation = conceptObservations[i];

				this.students_[actnum] = conceptObservation.studentId;
				this.skill_[actnum] = conceptObservation.conceptId;
				this.right_[actnum] = this.parseBoolean(conceptObservation.isCorrect) ? 1 : 0;

				actnum++;
				if (!(this.skill_[actnum - 1] === prevskill)) {
					prevskill = this.skill_[actnum - 1];
					if (this.skillnum > -1)
						this.skillends_[this.skillnum] = actnum - 2;
					this.skillnum++;
				}
			}

			prevskill = this.skill_[actnum - 1];
			if (this.skillnum > -1) {
				this.skillends_[this.skillnum] = actnum - 1;
			}

		} catch (e) {
			console.error(e);
		}

	}

	findGOOF( start, end, Lzero, trans, G, S) {
		let SSR = 0.0;
		let prevstudent = "FWORPLEJOHN";
		let prevL = 0.0;
		let likelihoodcorrect = 0.0;
		let prevLgivenresult = 0.0;
		let newL = 0.0;

		for (let i = start; i <= end; i++) {
			if (!(this.students_[i] === prevstudent)) {
				prevL = Lzero;
				prevstudent = this.students_[i];
			}

			if (this.lnminus1_estimation)
				likelihoodcorrect = prevL;
			else
				likelihoodcorrect = (prevL * (1.0 - S)) + ((1.0 - prevL) * G);
			SSR += (this.right_[i] - likelihoodcorrect) * (this.right_[i] - likelihoodcorrect);

			if (this.right_[i] == 1.0)
				prevLgivenresult = ((prevL * (1.0 - S)) / ((prevL * (1 - S)) + ((1.0 - prevL) * (G))));
			else
				prevLgivenresult = ((prevL * (S)) / ((prevL * (S)) + ((1.0 - prevL) * (1.0 - G))));

			newL = prevLgivenresult + (1.0 - prevLgivenresult) * trans;
			prevL = newL;
		}
		return SSR;
	}

	fit_skill_model(curskill) {
		let SSR = 0.0;
		let BestSSR = 9999999.0;
		let bestLzero = 0.01;
		let besttrans = 0.01;
		let bestG = 0.01;
		let bestS = 0.01;
		let topG = 0.99;
		let topS = 0.99;
		let topL0 = 0.99;
		let topT = 0.99;
		if (this.L0Tbounded) {
			topL0 = 0.85;
			topT = 0.3;
		}
		if (this.bounded) {
			topG = 0.3;
			topS = 0.1;
		}

		let startact = 0;
		if (curskill > 0)
			startact = this.skillends_[curskill - 1] + 1;
		let endact = this.skillends_[curskill];

		// System.out.print(students_[startact]);
		// System.out.print(" ");
		// System.out.println(students_[endact]);

		for (let Lzero = 0.01; Lzero <= topL0; Lzero = Lzero + 0.01)
			for (let trans = 0.01; trans <= topT; trans = trans + 0.01) {
				for (let G = 0.01; G <= topG; G = G + 0.01) {
					for (let S = 0.01; S <= topS; S = S + 0.01) {
						SSR = this.findGOOF(startact, endact, Lzero, trans, G, S);
						/**
						 * System.out.print(Lzero); System.out.print("\t");
						 * System.out.println(trans);
						 */
						if (SSR < BestSSR) {
							BestSSR = SSR;
							bestLzero = Lzero;
							besttrans = trans;
							bestG = G;
							bestS = S;
						}
					}
				}
			}

		// for a bit mroe precision
		let startLzero = bestLzero;
		let starttrans = besttrans;
		let startG = bestG;
		let startS = bestS;
		for (let Lzero = startLzero - 0.009; ((Lzero <= startLzero + 0.009) && (Lzero <= topL0)); Lzero = Lzero + 0.001)
			for (let G = startG - 0.009; ((G <= startG + 0.009) && (G <= topG)); G = G + 0.001) {
				for (let S = startS - 0.009; ((S <= startS + 0.009) && (S <= topS)); S = S + 0.001) {
					for (let trans = starttrans - 0.009; ((trans <= starttrans + 0.009) && (trans < topT)); trans = trans + 0.001) {
						SSR = this.findGOOF(startact, endact, Lzero, trans, G, S);
						if (SSR < BestSSR) {
							BestSSR = SSR;
							bestLzero = Lzero;
							besttrans = trans;
							bestG = G;
							bestS = S;
						}
					}
				}
			}

		return this.skill_[startact] + "\t" + bestLzero + "\t" + bestG + "\t" + bestS + "\t" + besttrans;
	}

	computeParameters(conceptObservations) {
		this.computelzerot(conceptObservations);

		let csv = ["ConceptId, L0, G, S, T"];
		for (let curskill = 0; curskill <= this.skillnum; curskill++) {
			let skillParams  = this.fit_skill_model(curskill);
			console.info(skillParams);
			csv.push(skillParams.replace(/\t/g, ","));
		}

		return csv.join("\n");
	}
}

module.exports = ComputeKTparamsAll;  