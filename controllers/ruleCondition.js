'use strict';

const Biologica = require('../shared/biologica');
const Biologicax = require('../shared/biologicax');
const Stringx = require("../utilities/stringx");
const propPath = require('property-path');

class RuleCondition {   

    constructor(propertyPath, value, displayVariable) {

        if (typeof propertyPath === "undefined") {
            throw new Error("Condition propertyPath value cannot be 'undefined'");
        }

        if (typeof value === "undefined") {
            throw new Error("Condition value cannot be 'undefined'");
        }

        this.propertyPath = propertyPath;
        this.isUserSelection = this.propertyPath.includes("userSelections");
        this.value = value;
        this.displayVariable = displayVariable;
        this.attribute = null;
    }

    populateSubstitutionVariables(variableMap) {
        variableMap[this.displayVariable] = this._getDisplayValue();
    }

    _getDisplayValue() {
        return this.value;
    }   

    evaluate(obj) {
        throw new Error("RuleCondition.evaluate() must be overriden in a child class");
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

class SexCondition extends RuleCondition {
    constructor(propertyPath, value, displayVariable) { 
        super(propertyPath, value, displayVariable);
        this.value = this.value.toLowerCase();
        this.attribute = "sex";

        this.target = value.toLowerCase();
        if (this.target !== "female" && this.target !== "male") { 
            throw new Error("SexCondition: unspported target value: " + this.target);
        }
    }

    evaluate(obj) {
        let sex = this.getValue(obj);
        let normalizedSex = BiologicaX.sexToString(sex).toLowerCase();
        let result = this.target === normalizedSex;
        return result;
    }    
}

class StringCondition extends RuleCondition {
    constructor(propertyPath, value, displayVariable, normalize) { 
        super(propertyPath, value, displayVariable);
 
        this.normalize = normalize == true;
        this.target = (value ? value.toLowerCase() : "");
        if (normalize === true) {
            this.target = this.target.toLowerCase();
        }
    }

    evaluate(obj) {
        let stringValue = this.getValue(obj);

        if (this.normalize) {
            stringValue = stringValue.toLowerCase();
        }

        return this.target == stringValue;
    }
 
}

class BoolCondition extends RuleCondition {
    constructor(propertyPath, value, displayVariable) { 
        super(propertyPath, value, displayVariable);
        this.target = (value ? value.toLowerCase() === "true" : false);
        this.value = this.target.toString().toLowerCase();
    }

    evaluate(obj) {
        let boolValue = this.getValue(obj);
        return this.target == boolValue;
    }      
}

class TraitCondition extends RuleCondition {
    constructor(propertyPath, value, displayVariable) { 
        super(propertyPath, value, displayVariable);
        this.attribute = BiologicaX.getCharacteristicFromTrait(BioLogica.Species.Drake, value);
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

        let result = BiologicaX.hasTrait(phenotype, this.attribute, this.value);
        return result;
    }

    _getDisplayValue() {
        return BiologicaX.getDisplayName(this.value);
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

class AllelesCondition extends TraitCondition {
    constructor(propertyPath, value, displayVariable) { 

        let targetAlleles = AllelesCondition.normalizeAlleles(value);
        let targetTrait = BiologicaX.getTraitFromAlleles(BioLogica.Species.Drake, targetAlleles);        

        super(propertyPath, targetTrait, displayVariable.replace("Alleles", "Trait"));

        this.targetAlleles = targetAlleles;
        this.displayVariableAlleles = displayVariable;     
    }

    static normalizeAlleles(alleles) {
        return alleles.split(",").map((item) => item.trim());
    }

    evaluate(obj) {
        let alleles = this._getValue(false, obj);
        // Fallback to trait evaluation if alleles aren't available
        if (!alleles) {
            return super.evaluate(obj);
        }        

        alleles = AllelesCondition.normalizeAlleles(alleles);
        let result = this.targetAlleles.every((item) => {
            return alleles.indexOf(item) >= 0;
        });
        return result;
    }  

    // Override in order to also include trait name
    populateSubstitutionVariables(variableMap) {
        super.populateSubstitutionVariables(variableMap);        
        variableMap[this.displayVariableAlleles] = this.targetAlleles[0];
    }     
}


module.exports.AllelesCondition = AllelesCondition;
module.exports.SexCondition = SexCondition;
module.exports.TraitCondition = TraitCondition;
module.exports.StringCondition = StringCondition;
module.exports.BoolCondition = BoolCondition;