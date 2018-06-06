/**
 * This file contains methods that eXtend the Biologica.js library
 * https://github.com/concord-consortium/biologica.js
 * 
 */

if (typeof exports === 'undefined') {
    var exports = window;
}

(function () {

    // Helper method

    // Warn if overriding existing method
    if(Array.prototype.equals)
    console.warn("Overriding existing Array.prototype.equals. Possible causes: New API defines the method, there's a framework conflict or you've got double inclusions in your code.");
    // attach the .equals method to Array's prototype to call it on any array
    Array.prototype.equals = function (array) {
    // if the other array is a falsy value, return
    if (!array)
        return false;

    // compare lengths - can save a lot of time 
    if (this.length != array.length)
        return false;

    for (var i = 0, l=this.length; i < l; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!this[i].equals(array[i]))
                return false;       
        }           
        else if (this[i] != array[i]) { 
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;   
        }           
    }       
    return true;
    }
    // Hide method from for-in loops
    Object.defineProperty(Array.prototype, "equals", {enumerable: false});

    BiologicaX = {};
    exports.BiologicaX = BiologicaX;

    BiologicaX.sexToString = function(sex) {
        // If sex is already a string, just return it.
        if (typeof sex === "string") {
            return sex;
        } else {
            return (sex == 0 ? "Male" : "Female");
        }
    }

    BiologicaX.sexFromString = function(str) {
        // If sex is already a number, just return it.
        if (!isNaN(parseFloat(str))) {
            return str;
        } else {
            return (str && str.toLowerCase() === "male" ? 0 : 1);
        }
    }

    BiologicaX.randomizeAlleles = function(species, genes, alleles) {

        var allelesToRandomize = [];
        var genesLength = genes.length;
        for (var i = 0; i < genesLength; i++) {
            var gene = genes[i];
            allelesToRandomize.push(BiologicaX.findAllele(species, alleles, 'a', gene));
            allelesToRandomize.push(BiologicaX.findAllele(species, alleles, 'b', gene));
        }
        var allelesToRandomize = shuffle(allelesToRandomize);

        var randomAllelesTarget = minRandomAlleles + ExtMath.randomInt(maxRandomAlleles - minRandomAlleles);
        var totalRandomizedAlleles = 0;

        var allelesToRandomizeLength = allelesToRandomize.length;
        for (var i = 0; i < allelesToRandomizeLength; i++) {
            var originalAllele = allelesToRandomize[i];
            var randomAllele = BiologicaX.getRandomAllele(
                species,
                BiologicaX.getGene(species, originalAllele),
                BiologicaX.getSide(originalAllele),
                [originalAllele]);
            alleles = alleles.replace(originalAllele, randomAllele);
            ++totalRandomizedAlleles;
            if (totalRandomizedAlleles >= randomAllelesTarget) {
                break;
            }
        }

        return alleles;
    }

    BiologicaX.getRandomAllele = function(species, gene, side, excluding) {
        var randomAllele = null;
        var allelesLength = species.geneList[gene].alleles.length;
        var i = ExtMath.randomInt(allelesLength);
        while (randomAllele == null || excluding.includes(randomAllele)) {
            randomAllele = side + ':' + species.geneList[gene].alleles[i];
            if (++i >= allelesLength) {
                i = 0;
            }
        }
        return randomAllele;
    }

    BiologicaX.replaceAllele = function(species, gene, alleles, newAllele) {
        var side = BiologicaX.getSide(newAllele);
        return alleles.replace(BiologicaX.findAllele(species, alleles, side, gene), newAllele);
    }

    BiologicaX.getSide = function(allele) {
        return allele.match(/[a-b]/);
    }

    BiologicaX.getGene = function(species, allele) {
        var geneName = null;
        var alleleWithoutSide = allele.replace(/.+:/, "");

        Object.keys(species.geneList).forEach(function (key, index) {
            if (species.geneList[key].alleles.includes(alleleWithoutSide)) {
                geneName = key;
                return false;
            }
        });
        return geneName;
    }

    BiologicaX.getCharacteristic = function(organism, trait) {
        var characteristic = null; 
        if (trait.includes("metallic")) {
            characteristic = organism.getCharacteristic('color');
            if (BiologicaX.isColorMetallic(characteristic)) {
                characteristic = 'Metallic';
            } else {
                characteristic = 'Nonmetallic';
            }
        } else {
            characteristic = organism.getCharacteristic(trait);
        }

        return characteristic;
    }

    BiologicaX.isColorMetallic = function(color) {
        return (color == 'Frost'
                || color == 'Steel'
                || color == 'Copper'
                || color == 'Silver'
                || color == 'Gold');
    }

    BiologicaX.isAlbino = function(color) {
        return (color === 'Frost');
    }

    BiologicaX.isOrange = function(color) {
        return (color == 'Copper'
                || color == 'Gold'
                || color == 'Lava'
                || color == 'Sand');
    }

    BiologicaX.colorAsTrait = function(color, alleles) {
        let allele = alleles[0].replace(/.+:/, "").toLowerCase();

        if (BiologicaX.isColorMetallic(color) && allele == "m") {
            return "Metallic";
        } else if (BiologicaX.isAlbino(color) && allele == "c") {
            return "Albino";
        } else if (BiologicaX.isOrange(color) && allele == "b") {
            return "Orange";
        } else {
            return color;
        }
    }

    BiologicaX.hasAnyArmor = function(armor) {
        return (armor !== 'No armor');
    }

    BiologicaX.hasTrait = function(phenotype, characteristic, trait) { 
        if (characteristic === "metallic") {
            return (trait == "Metallic" ? BiologicaX.isColorMetallic(phenotype.color) : !BiologicaX.isColorMetallic(phenotype.color));
        } else if (characteristic === "albino") {
            return BiologicaX.isAlbino(phenotype.color);
        } else if (characteristic === "color") {
            return !BiologicaX.isAlbino(phenotype.color);
        } else if (characteristic === "orange") {
            return BiologicaX.isOrange(phenotype.color);
        } else if (characteristic === "gray") {
            return !BiologicaX.isOrange(phenotype.color);     
        } else {
            return phenotype[characteristic] == trait;
        }
    }

    BiologicaX.findAllele = function(species, alleles, side, gene) {
        var allOptions = '(?:' + species.geneList[gene].alleles.join('|') + ')';
        var regex = new RegExp('(' + side + ':' + allOptions + ')(?:,|$)', '');
        var matches = alleles.match(regex);
        return (matches != null ? matches[1] : null)
    }

    BiologicaX.findAlleleForCharacteristic = function(species, alleles, side, characteristic) {
        var gene = BiologicaX.findTraitForCharacteristic(characteristic);

        return BiologicaX.findAllele(species, alleles, side, gene);
    }

    BiologicaX.findTraitForCharacteristic = function(characteristic) {
        var trait = null;

        var normalizedCharacteristic = characteristic.toLowerCase();
        if (normalizedCharacteristic.includes("metallic")) {
            trait = "metallic";
        } else if (normalizedCharacteristic.includes("wings")) {
            trait = "wings";
        } else if (normalizedCharacteristic.includes("forelimbs")) {
            trait = "forelimbs";
        } else if (normalizedCharacteristic.includes("hindlimbs")) {
            trait = "hindlimbs";
        }

        return trait;
    }


    // Returns generic allele pattern for a given gene. For example: 
    //   a:W b:w returns H-h
    //   a:Hl b:Hl returns H-H
    BiologicaX.getAlleleAsInheritancePattern = function(species, alleles, gene) {
        var sideA = BiologicaX.findAllele(species, alleles, 'a', gene).replace('a:', '');
        var sideB = BiologicaX.findAllele(species, alleles, 'b', gene).replace('b:', '');

        // NOTE: This function assusmes that capital letter in the allele indicates
        // present while a lowercase letter indicates the gene is not present.
        var leftH = sideA[0] == sideA[0].toUpperCase() ? 'Q' : 'q';
        var rightH = sideB[0] == sideB[0].toUpperCase() ? 'Q' : 'q'; 
        
        return leftH + '-' + rightH;
    }    

    BiologicaX.getInheritancePatternForGene = function(organism, gene) {

        var characteristic = BiologicaX.getCharacteristic(organism, gene);

        var pattern = null;
        var alleleLabelMap = organism.species.alleleLabelMap;
        for (var allele in alleleLabelMap) {
            if (alleleLabelMap.hasOwnProperty(allele)) {
                if (alleleLabelMap[allele] == characteristic) {
                    if (allele[0] == allele[0].toUpperCase()) {
                        pattern = 'Dominant';
                    } else {
                        pattern = 'Recessive';
                    }
                    break;
                }
            }
        }        

        return pattern;
    }      

    // Get a trait as it relates to a specific characteristic
    BiologicaX.getTraitAsCharacteristic = function(trait, characteristic) {
        if (characteristic.toLowerCase() === "metallic") {
            if (BiologicaX.isColorMetallic(characteristic)) {
                trait = 'Metallic';
            } else {
                trait = 'Nonmetallic';
            }
        }

        return trait;
    }

    BiologicaX.getTraitFromPhenotype = function(phenotype, characteristic) {
        let trait = null; 
        if (characteristic == 'metallic') {
            trait = phenotype['color'];
            if (BiologicaX.isColorMetallic(trait)) {
                trait = 'Metallic';
            } else {
                trait = 'Nonmetallic';
            }
        } else {
            trait = phenotype[characteristic];
        }

        return trait;
    }

    BiologicaX.getTraitFromAlleles = function(species, alleles) {
        let allelesWithoutSides = alleles.map((allele) => allele.replace(/.+:/, "")).sort();

        for (let characteristic in species.traitRules) {
            if (!species.traitRules.hasOwnProperty(characteristic)) {
                continue;
            }
            
            for (let trait in species.traitRules[characteristic]) {
                if (!species.traitRules[characteristic].hasOwnProperty(trait)) {
                    continue;
                }

                for (let traitAlleles of species.traitRules[characteristic][trait]) {
                    if (BiologicaX.allelesInTraitArray(allelesWithoutSides, traitAlleles)) {
                        return BiologicaX.colorAsTrait(trait, alleles);
                    }
                }
            }
        }
   } 

   BiologicaX.allelesInTraitArray = function(targetAlleles, traitAlleles) {
       if (!targetAlleles || targetAlleles.length == 0 || !traitAlleles || traitAlleles.length == 0) {
           return false;
       }

       let clone = traitAlleles.slice(0);

       for (let allele of targetAlleles) {
           let index = clone.indexOf(allele);
           if (index < 0) {
               return false;
           }
           clone.splice(index, 1);
       }

       return true;
   }

    BiologicaX.getCharacteristicFromTrait = function(species, trait) {
        var normalizedTrait = trait.toLowerCase();

        if (normalizedTrait.includes('metallic')) {
            return 'metallic';
        } else {
            for (let characteristic in species.traitRules) {
                if (!species.traitRules.hasOwnProperty(characteristic)) {
                    continue;
                }
                
                for (let trait in species.traitRules[characteristic]) {
                    if (!species.traitRules[characteristic].hasOwnProperty(trait)) {
                        continue;
                    }

                    if (trait.toLowerCase() == normalizedTrait) {
                        return characteristic;
                    }
                }
            }
        }
   }    

    // If necessary, convert internal name for trait or characteristic to 
    // a user-friendly display name
    BiologicaX.getDisplayName = function(trait) {
        let displayName = trait.toLowerCase();
        if (displayName === "wings") {
            displayName = "wings";
        } else if (displayName === "no wings") {
            displayName = "wingless";
        } else if (displayName === "forelimbs") {
            displayName = "arms";
        } else if (displayName === "no forelimbs") {
            displayName = "armless";
        } else if (displayName === "hindlimbs") {
            displayName = "legs";
        } else if (displayName === "no hindlimbs") {
            displayName = "legless";
        } else if (displayName === "metallic") {
            displayName = "shiny";
        } else if (displayName === "nonmetallic") {
            displayName = "dull";
        } else if (displayName === "five armor") {
            displayName = "full armor";
        } else if (displayName === "three armor") {
            displayName = "partial armor";
        } else if (displayName === "three armor") {
            displayName = "partial armor";
        }
        return displayName;
    }    

    BiologicaX.getChallengeIdBase = function(challengeId) {
        // Trailing number on the challenge ID should be ignored since they
        // represent different trials of the same challenege
        return challengeId.replace(/-?\d*$/,"");
    }

}).call(this);