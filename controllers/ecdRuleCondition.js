'use strict';

const Biologica = require('../shared/biologica');
const biologicax = require('../shared/biologicax');
const Stringx = require("../utilities/stringx");

class EcdRuleCondition {   

    static create(columnName, value) {
        var type = this.extractTypeFromFieldName(columnName);
        var fieldName = columnName.toCamelCase();

        var condition = null;
        switch(type.toLowerCase()) {

            case "alleles":
                condition = new AllelesCondition(fieldName, value);
                break;

            case "sex":
                condition = new SexCondition(fieldName, value);
                break;

            case "characteristics":
                condition = new CharacteristicsCondition(fieldName, value);
                break;

            default:
                throw new Error("Unknown EcdRuleCondition type: " + type);
        }

        return condition;
    }

    // Assume last word specifies the type of rule
    static extractTypeFromFieldName(fieldName) {
        var words = fieldName.split("-");
        return words[words.length - 1];
    }

    constructor(fieldName, value) {
        this.fieldName = fieldName;
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
    constructor(fieldName, value) { 
        super(fieldName, value);
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
    constructor(fieldName, value) { 
        super(fieldName, value);
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
    constructor(fieldName, value) { 
        super(fieldName, value);
        this.targetCharacteristics = this.normalizeCharacterisitics(value.split(","));
        this.attributeName = BiologicaX.findTraitForCharacteristic(this.targetCharacteristics[0]);
    }

    normalizeCharacterisitics(phenotype) {
        return phenotype.map((item) => item.toLowerCase().trim());
    }

    evaluate(attributes) {
        var phenotype = attributes.phenotype;

        if (!phenotype) {
            phenotype = this.createPhenotypeFromAlleles(attributes);
        }

        if (!phenotype) {
            throw new Error("CharacteristicsCondition.evaluate() - attributes missing property: phenotype");
        }

        var characterisitics = this.normalizeCharacterisitics(Object.keys(phenotype).map(key => phenotype[key]));
        var result = this.targetCharacteristics.every((item) => {
            if (item === "metallic") {
                return BiologicaX.isColorMetallic(phenotype.color);
            } else if (item === "armor") {
                return BiologicaX.hasAnyArmor(phenotype.armor);          
            } else {
                return characterisitics.indexOf(item) >= 0;
            }
        });
        return result;
    }

    createPhenotypeFromAlleles(attributes) {
        var phenotype = null;
        
        if (attributes.hasOwnProperty("alleles") && attributes.hasOwnProperty("sex")) {
            console.warn("Phenotype missing from context. Creating from alleles. Assuming species is Drake");
            var organism = new BioLogica.Organism(BioLogica.Species.Drake, attributes.alleles, BiologicaX.sexFromString(attributes.sex));
            phenotype = organism.phenotype.characteristics;
        }
        
        return phenotype;
    }
}

module.exports = EcdRuleCondition;
module.exports.CharacteristicsCondition = CharacteristicsCondition;