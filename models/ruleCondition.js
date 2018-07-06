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
        this.isUserSelection = this.propertyPath.includes("selected");
        this.value = value;
        this.displayVariable = displayVariable;
        this.attribute = null;
    }

    toString() {
        return this.propertyPath + " " + this.value;
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

    static _getPropertyPath(propertyPath, propertyOverride) {
        if (propertyOverride) {
            let parts = propertyPath.split(".");
            parts[parts.length - 1] = parts[parts.length - 1].replaceLastWordInCamelCase(propertyOverride);
            return parts.join(".");
        } else {
            return propertyPath;
        }
    }

    hasValue(obj, propertyOverride) {
        return this._getValue(false, obj, this.propertyPath, propertyOverride) != undefined;
    }

    getValue(obj, propertyOverride) {
        return this._getValue(true, obj, this.propertyPath, propertyOverride);
    }

    getValueOrUndefined(obj, propertyOverride) {
        return this._getValue(false, obj, this.propertyPath, propertyOverride);
    }

    _getValue(throwOnMissingProperty, obj, propertyPath, propertyOverride) {
        if (obj == undefined || obj == null) {
            throw new Error("Condition unable to evaluate undefined or null object");
        }

        let finalPropertyPath = RuleCondition._getPropertyPath(propertyPath, propertyOverride);
        let propertyValue = propPath.get(obj, finalPropertyPath);
        if (throwOnMissingProperty && propertyValue == undefined) {
            throw new Error("Condition unable to find value at property path: " + finalPropertyPath);
        }

        return propertyValue;
    }

    setValue(obj, value, propertyOverride) {
        if (obj == undefined || obj == null) {
            throw new Error("Condition unable to set property on undefined or null object");
        }

        let finalPropertyPath = RuleCondition._getPropertyPath(this.propertyPath, propertyOverride);
        return propPath.set(obj, finalPropertyPath, value);
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

    static hasSelectionChanged(event) {
        let selectedValue = propPath.get(event, "context.selected.sex");
        let previousValue = propPath.get(event, "context.previous.sex");

        return previousValue === undefined || selectedValue != previousValue;
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
        let phenotype = this.getValueOrUndefined(obj);

        // Fallback if propertyPath isn't available
        if (!phenotype) {
            phenotype = this.getValueOrUndefined(obj, "phenotype");  
        }

        // Fallback if 'phenotype' isn't available
        if (!phenotype) {
            phenotype = this.createPhenotypeFromAlleles(
                obj,
                this.getValueOrUndefined(obj, "alleles"), 
                this.getValueOrUndefined(obj, "sex"));
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
        if (targetTrait == null) {
            throw new Error("Unable to identify trait for alleles: " + targetAlleles);
        }     

        super(propertyPath, targetTrait, displayVariable.replace("Alleles", "Trait"));

        this.targetAlleles = targetAlleles;
        this.displayVariableAlleles = displayVariable;     
    }

    toString() {
        return this.propertyPath + " " + this.targetAlleles;
    }


    static normalizeAlleles(alleles) {
        return alleles.split(",").map((item) => item.trim());
    }

    static hasSelectionChanged(event, characteristic) {
        if (event.isMatch('USER', 'SUBMITTED', 'OFFSPRING')) {
            let previousMotherAlleles = propPath.get(event, "context.previous.motherAlleles");
            let previousFatherAlleles = propPath.get(event, "context.previous.fatherAlleles");
            let previousOffspringAlleles = propPath.get(event, "context.previous.offspringAlleles");
            let previousOffspringSex = propPath.get(event, "context.previous.offspringSex");

            let selectedMotherAlleles = propPath.get(event, "context.selected.motherAlleles");
            let selectedFatherAlleles = propPath.get(event, "context.selected.fatherAlleles");
            let selectedOffspringAlleles = propPath.get(event, "context.selected.offspringAlleles");
            let selectedOffspringSex = propPath.get(event, "context.selected.offspringSex");

            return AllelesCondition._hasSelectionChanged(previousMotherAlleles, "Female", selectedMotherAlleles, "Female", characteristic)
                || AllelesCondition._hasSelectionChanged(previousFatherAlleles, "Male", selectedFatherAlleles, "Male", characteristic)
                || AllelesCondition._hasSelectionChanged(previousOffspringAlleles, previousOffspringSex, selectedOffspringAlleles, selectedOffspringSex, characteristic);
        } else {
            let previousAlleles = propPath.get(event, "context.previous.alleles");
            let previousSex = propPath.get(event, "context.previous.sex");
            let selectedAlleles = propPath.get(event, "context.selected.alleles");
            let selectedSex = propPath.get(event, "context.selected.sex"); 
            return AllelesCondition._hasSelectionChanged(previousAlleles, previousSex, selectedAlleles, selectedSex, characteristic);
        }

        // Assume selection did change if we can't determine the state
        return true;
    }

    static _hasSelectionChanged(previousAlleles, previousSex, selectedAlleles, selectedSex, characteristic) {
        if (previousAlleles && previousSex && selectedAlleles && selectedSex) {
            let previousOrganism = new BioLogica.Organism(BioLogica.Species.Drake, previousAlleles, BiologicaX.sexFromString(previousSex));
            let currentOrganism = new BioLogica.Organism(BioLogica.Species.Drake, selectedAlleles, BiologicaX.sexFromString(selectedSex));

            if (BiologicaX.isBaseColor(characteristic)) {
                characteristic = "color";
            }
            let currentTraitAlleles = currentOrganism.getAlleleStringForTrait(characteristic);
            let previousTraitAlleles = previousOrganism.getAlleleStringForTrait(characteristic);
            return currentTraitAlleles != previousTraitAlleles;  
        }

        return true;
    }

    evaluate(obj) {
        let alleles = this.getValueOrUndefined(obj);
        // Fallback to trait evaluation if alleles aren't available
        if (!alleles) {
            return super.evaluate(obj);
        }        

        alleles = AllelesCondition.normalizeAlleles(alleles);
        let result = this.targetAlleles.every((item) => {
            let alleleRegex = new RegExp("^" + item + "$", '');
            return alleles.findIndex(value => alleleRegex.test(value)) >= 0;
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