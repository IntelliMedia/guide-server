'use strict';

const Biologica = require('../shared/biologica');
const Biologicax = require('../shared/biologicax');
const Stringx = require("../utilities/stringx");
const propPath = require('property-path');

class EcdRuleCondition {   

    constructor(propertyPath, value) {

        if (typeof propertyPath === "undefined") {
            throw new Error("Condition propertyPath value cannot be 'undefined'");
        }

        if (typeof value === "undefined") {
            throw new Error("Condition value cannot be 'undefined'");
        }

        this.propertyPath = propertyPath;
        this.value = value; 
        this.trait = null;
    }

    description() {
        return this.value;
    }

    evaluate(obj) {
        throw new Error("EcdRuleCondition.evaluate() must be overriden in a child class");
    }

    getPropertyPath(propertyOverride) {
        if (propertyOverride) {
            let parts = this.propertyPath.split(".");
            parts[parts.length - 1] = parts[parts.length - 1].replaceLastWordInCamelCase(propertyOverride);
            return parts.join(".");
        } else {
            return this.propertyPath;
        }
    }

    hasValue(obj, propertyOverride) {
        return this._getValue(false, obj, propertyOverride) != undefined;
    }

    getValue(obj, propertyOverride) {
        return this._getValue(true, obj, propertyOverride);
    }

    _getValue(throwOnMissingProperty, obj, propertyOverride) {
        if (obj == undefined || obj == null) {
            throw new Error("Condition unable to evaluate undefined or null object");
        }

        let path = this.getPropertyPath(propertyOverride);
        let propertyValue = propPath.get(obj, path);
        if (throwOnMissingProperty && propertyValue == undefined) {
            throw new Error("Condition unable to find value at property path: " + path);
        }

        return propertyValue;
    }

    setValue(obj, value, propertyOverride) {
        if (obj == undefined || obj == null) {
            throw new Error("Condition unable to set property on undefined or null object");
        }

        let path = this.getPropertyPath(propertyOverride);
        return propPath.set(obj, path, value);
    }
}

class AllelesCondition extends EcdRuleCondition {
    constructor(propertyPath, value) { 
        super(propertyPath, value);
        this.targetAlleles = this.normalizeAlleles(value);
        this.trait = BiologicaX.getGene(BioLogica.Species.Drake, this.targetAlleles[0]);
    }

    normalizeAlleles(alleles) {
        return alleles.split(",").map((item) => item.trim());
    }

    evaluate(obj) {
        let alleles = this.getValue(obj);
        alleles = this.normalizeAlleles(alleles);
        let result = this.targetAlleles.every((item) => {
            return alleles.indexOf(item) >= 0;
        });
        return result;
    }
}

class SexCondition extends EcdRuleCondition {
    constructor(propertyPath, value) { 
        super(propertyPath, value);
        this.trait = "sex";

        this.target = value.toLowerCase();
        if (this.target !== "female" && this.target !== "male") { 
            throw new Error("SexCondition: unspported target value: " + this.target);
        }
    }

    evaluate(obj) {
        let sex = this.getValue(obj);
        let result = this.target === BiologicaX.sexToString(sex).toLowerCase();
        return result;
    }
}

class StringCondition extends EcdRuleCondition {
    constructor(propertyPath, value, normalize) { 
        super(propertyPath, value);
 
        this.normalize = normalize == true;
        this.target = (value ? value.toLowerCase() : "");
        if (normalize === true) {
            this.target = this.target.toLowerCase();
        }
    }

    evaluate(obj) {
        let value = this.getValue(obj);
        if (this.normalize) {
            value = value.toLowerCase();
        }

        return this.target == value;
    }
}

class BoolCondition extends EcdRuleCondition {
    constructor(propertyPath, value) { 
        super(propertyPath, value);
 
        this.target = (value ? value.toLowerCase() === "true" : false);
    }

    evaluate(obj) {
        let value = this.getValue(obj);
        return this.target == value;
    }
}

class CharacteristicsCondition extends EcdRuleCondition {
    constructor(propertyPath, value) { 
        super(propertyPath, value);
        this.targetCharacteristics = this.normalizeCharacterisitics(value.split(","));
        this.trait = BiologicaX.getTrait(BioLogica.Species.Drake, this.targetCharacteristics[0]);
    }

    normalizeCharacterisitics(phenotype) {
        return phenotype.map((item) => item.toLowerCase().trim());
    }

    evaluate(obj) {
        let phenotype = this._getValue(false, obj);

        // Fallback if propertyPath isn't available
        if (!phenotype) {
            phenotype = this._getValue(false, obj, "phenotype");  
        }

        // Fallback if 'phenotype' isn't available
        if (!phenotype) {
            phenotype = this.createPhenotypeFromAlleles(
                obj,
                this._getValue(false, obj, "alleles"), 
                this._getValue(false, obj, "sex"));
        }

        if (!phenotype) {
            throw new Error("Condition unable to construct phenotype. Unable find any properties: " + this.propertyPath + ", phenotype, alleles, or sex");
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

    createPhenotypeFromAlleles(obj, alleles, sex) {
        var phenotype = null; 

        if (alleles != undefined && sex != undefined) {
            console.warn("Phenotype missing from context. Creating from alleles. Assuming species is Drake");
            var organism = new BioLogica.Organism(BioLogica.Species.Drake, alleles, BiologicaX.sexFromString(sex));
            phenotype = organism.phenotype.characteristics;  
            //console.info("attributes.phenotype = " + JSON.stringify(attributes.phenotype, undefined, 2));
            // Set the phenotype on the object so that we don't have to compute it everytime
            this.setValue(obj, phenotype, "phenotype");
        }
        
        return phenotype;
    }
}

module.exports.AllelesCondition = AllelesCondition;
module.exports.SexCondition = SexCondition;
module.exports.CharacteristicsCondition = CharacteristicsCondition;
module.exports.StringCondition = StringCondition;
module.exports.BoolCondition = BoolCondition;