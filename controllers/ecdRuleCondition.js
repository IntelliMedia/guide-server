'use strict';

const Biologica = require('../shared/biologica');
const biologicax = require('../shared/biologicax');

class EcdRuleCondition {   

    static create(type, value) {
        var condition = null;
        switch(type.toLowerCase()) {

            case "alleles":
                condition = new AllelesCondition(value);
                break;

            case "sex":
                condition = new SexCondition(value);
                break;

            case "characteristics":
                condition = new CharacteristicsCondition(value);
                break;

            default:
                throw new Error("Unknown EcdRuleCondition type: " + type);
        }

        return condition;
    }

    constructor(value) {
        this.value = value; 
        if (typeof value === "undefined") {
            throw new Error("EcdRuleCondition condition value cannot be 'undefined'");
        }

        this.attributeName = null;
    }

    description() {
        return this.value;
    }

    evaluate(attributes) {
        throw new Error("EcdRuleCondition.evaluate() must be overriden in a child class");
    }

}

class AllelesCondition extends EcdRuleCondition {
    constructor(value) { 
        super(value);
        this.targetAlleles = this.normalizeAlleles(value);
    }

    normalizeAlleles(alleles) {
        return alleles.split(",").map((item) => item.trim());
    }

    evaluate(attributes) {
        if (!attributes || !attributes.hasOwnProperty("alleles")) {
            throw new Error("AllelesCondition.evaluate() - attributes missing property: alleles");
        }
        var alleles = this.normalizeAlleles(attributes.alleles);
        var result = this.targetAlleles.every((item) => {
            return alleles.indexOf(item) >= 0;
        });
        return result;
    }
}

class SexCondition extends EcdRuleCondition {
    constructor(value) { 
        super(value);
        this.attributeName = "sex";

        var targetSex = value.toLowerCase();
        if (targetSex !== "female" && targetSex !== "male") { 
            throw new Error("SexCondition: unspported target value: " + targetSex);
        }
        this.sex = targetSex;
    }

    evaluate(attributes) {
        if (!attributes || !attributes.hasOwnProperty("sex")) {
            throw new Error("SexCondition.evaluate() - attributes missing property: sex");
        }
        var result = this.sex === attributes.sex.toLowerCase();
        return result;
    }
}

class CharacteristicsCondition extends EcdRuleCondition {
    constructor(value) { 
        super(value);
        this.targetCharacteristics = this.normalizeCharacterisitics(value.split(","));
        this.attributeName = BiologicaX.findTraitForCharacteristic(this.targetCharacteristics[0]);
    }

    normalizeCharacterisitics(phenotype) {
        return phenotype.map((item) => item.toLowerCase().trim());
    }

    evaluate(attributes) {
        if (!attributes || !attributes.hasOwnProperty("phenotype")) {
            throw new Error("CharacteristicsCondition.evaluate() - attributes missing property: phenotype");
        }
        var characterisitics = this.normalizeCharacterisitics(Object.keys(attributes.phenotype).map(key => attributes.phenotype[key]));
        var result = this.targetCharacteristics.every((item) => {
            if (item == "metallic") {
                return BiologicaX.isColorMetallic(attributes.phenotype.color);
            } else {
                return characterisitics.indexOf(item) >= 0;
            }
        });
        return result;
    }
}



module.exports = EcdRuleCondition;
module.exports.CharacteristicsCondition = CharacteristicsCondition;