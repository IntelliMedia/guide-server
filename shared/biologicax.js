/**
 * This file contains methods that eXtend the Biologica.js library
 * https://github.com/concord-consortium/biologica.js
 * 
 */

if (typeof exports === 'undefined') {
    var exports = window;
}

(function () {

    BiologicaX = {};
    exports.BiologicaX = BiologicaX;

    BiologicaX.sexToString = function(sex) {
        return (sex == 0 ? "Male" : "Female");
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

     BiologicaX.getTrait = function(organism, characteristic) {
         var isMetallicCharacteristic = false;
         var targetCharacteristic = characteristic.toLowerCase();
         if (targetCharacteristic.includes("metallic")) {
             return "metallic";
         }

         var foundTrait = null;
         for (var trait in organism.species.traitRules) {
             if (!organism.species.traitRules.hasOwnProperty(trait)) {
                 continue;
             }
             
             for (var characteristic in organism.species.traitRules[trait]) {
                if (!organism.species.traitRules[trait].hasOwnProperty(characteristic)) {
                    continue;
                }

                if (characteristic.toLowerCase() == targetCharacteristic) {
                    foundTrait = trait;
                }
             }
             if (foundTrait) {
                 break;
             }
         }

         if (isMetallicCharacteristic) {
            if (foundTrait == 'Steel'
                || foundTrait == 'Copper'
                || foundTrait == 'Silver'
                || foundTrait == 'Gold') {
                    foundTrait = 'Metallic';
                } else {
                    foundTrait = 'Nonmetallic';
                }
         }

        return foundTrait;
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
        return (color == 'Steel'
                || color == 'Copper'
                || color == 'Silver'
                || color == 'Gold');
    }

    BiologicaX.hasAnyArmor = function(armor) {
        return (armor !== 'No armor');
    }

    BiologicaX.findAllele = function(species, alleles, side, gene) {
        var allOptions = '(?:' + species.geneList[gene].alleles.join('|') + ')';
        var regex = new RegExp(side + ':' + allOptions, '');
        return alleles.match(regex).toString();
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
        var leftH = sideA[0] == sideA[0].toUpperCase() ? 'H' : 'h';
        var rightH = sideB[0] == sideB[0].toUpperCase() ? 'H' : 'h'; 
        
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

    BiologicaX.getCharacteristicFromPhenotype = function(phenotype, gene) {
        var characteristic = null; 
        if (gene == 'metallic') {
            characteristic = phenotype['color'];
            if (characteristic == 'Steel'
                || characteristic == 'Copper'
                || characteristic == 'Silver'
                || characteristic == 'Gold') {
                    characteristic = 'Metallic';
                } else {
                    characteristic = 'Nonmetallic';
                }
        } else {
            characteristic = phenotype[gene];
        }

        return characteristic;
    }

}).call(this);