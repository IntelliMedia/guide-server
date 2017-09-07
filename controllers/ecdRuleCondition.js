'use strict';

const Biologica = require('../shared/biologica');
const Biologicax = require('../shared/biologicax');
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

        this.trait = null;
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
        this.trait = BiologicaX.getGene(BioLogica.Species.Drake, this.targetAlleles[0]);
    }

    normalizeAlleles(alleles) {
        return alleles.split(",").map((item) => item.trim());
    }

    evaluate(attributes) {
        if (!attributes || !attributes.hasOwnProperty(this.fieldName)) {
            throw new Error("AllelesCondition.evaluate() - attributes missing property: " + this.fieldName);
        }
        var alleles = this.normalizeAlleles(attributes[this.fieldName]);
        var result = this.targetAlleles.every((item) => {
            return alleles.indexOf(item) >= 0;
        });
        return result;
    }
}

class SexCondition extends EcdRuleCondition {
    constructor(fieldName, value) { 
        super(fieldName, value);
        this.trait = "sex";

        var targetSex = value.toLowerCase();
        if (targetSex !== "female" && targetSex !== "male") { 
            throw new Error("SexCondition: unspported target value: " + targetSex);
        }
        this.sex = targetSex;
    }

    evaluate(attributes) {
        if (!attributes || !attributes.hasOwnProperty(this.fieldName)) {
            throw new Error("SexCondition.evaluate() - attributes missing property: " + this.fieldName);
        }
        var result = this.sex === BiologicaX.sexToString(attributes[this.fieldName]).toLowerCase();
        return result;
    }
}

class CharacteristicsCondition extends EcdRuleCondition {
    constructor(fieldName, value) { 
        super(fieldName, value);
        this.targetCharacteristics = this.normalizeCharacterisitics(value.split(","));
        this.trait = BiologicaX.findTraitForCharacteristic(this.targetCharacteristics[0]);
    }

    normalizeCharacterisitics(phenotype) {
        return phenotype.map((item) => item.toLowerCase().trim());
    }

    evaluate(attributes) {
        var phenotype = (attributes.hasOwnProperty(this.fieldName) ? attributes[this.fieldName] : attributes.phenotype);

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
            } else if (item === "nonmetallic") {
                return !BiologicaX.isColorMetallic(phenotype.color);
            } else if (item === "albino") {
                return BiologicaX.isAlbino(phenotype.color);
            } else if (item === "color") {
                return !BiologicaX.isAlbino(phenotype.color);
            } else if (item === "orange") {
                return BiologicaX.isOrange(phenotype.color);
            } else if (item === "gray") {
                return !BiologicaX.isOrange(phenotype.color);
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
        
        var allelesPropName = this.fieldName.replace("Characteristics", "Alleles").lowerCaseFirstChar();
        var sexPropName = this.fieldName.replace("Characteristics", "Sex").lowerCaseFirstChar();

        if (attributes.hasOwnProperty(allelesPropName) && attributes.hasOwnProperty(sexPropName)) {
            console.warn("Phenotype missing from context. Creating from alleles. Assuming species is Drake");
            var organism = new BioLogica.Organism(BioLogica.Species.Drake, attributes[allelesPropName], BiologicaX.sexFromString(attributes[sexPropName]));
            phenotype = organism.phenotype.characteristics;
            attributes.phenotype = phenotype;
            console.info("attributes.phenotype = " + JSON.stringify(attributes.phenotype, undefined, 2));
        }
        
        return phenotype;
    }
}

module.exports = EcdRuleCondition;
module.exports.CharacteristicsCondition = CharacteristicsCondition;