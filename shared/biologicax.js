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

    BiologicaX.randomizeAlleles = function(genes, alleles) {

        var allelesToRandomize = [];
        var genesLength = genes.length;
        for (var i = 0; i < genesLength; i++) {
            var gene = genes[i];
            allelesToRandomize.push(BiologicaX.findAllele(alleles, 'a', gene));
            allelesToRandomize.push(BiologicaX.findAllele(alleles, 'b', gene));
        }
        var allelesToRandomize = shuffle(allelesToRandomize);

        var randomAllelesTarget = minRandomAlleles + ExtMath.randomInt(maxRandomAlleles - minRandomAlleles);
        var totalRandomizedAlleles = 0;

        var allelesToRandomizeLength = allelesToRandomize.length;
        for (var i = 0; i < allelesToRandomizeLength; i++) {
            var originalAllele = allelesToRandomize[i];
            var randomAllele = BiologicaX.getRandomAllele(
                BiologicaX.getGene(originalAllele),
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

    BiologicaX.getRandomAllele = function(gene, side, excluding) {
        var randomAllele = null;
        var allelesLength = targetSpecies.geneList[gene].alleles.length;
        var i = ExtMath.randomInt(allelesLength);
        while (randomAllele == null || excluding.includes(randomAllele)) {
            randomAllele = side + ':' + targetSpecies.geneList[gene].alleles[i];
            if (++i >= allelesLength) {
                i = 0;
            }
        }
        return randomAllele;
    }

    BiologicaX.replaceAllele = function(gene, alleles, newAllele) {
        var side = BiologicaX.getSide(newAllele);
        return alleles.replace(BiologicaX.findAllele(alleles, side, gene), newAllele);
    }

    BiologicaX.getSide = function(allele) {
        return allele.match(/[a-b]/);
    }

    BiologicaX.getGene = function(allele) {
        var geneName = null;
        var alleleWithoutSide = allele.replace(/.+:/, "");

        Object.keys(targetSpecies.geneList).forEach(function (key, index) {
            if (targetSpecies.geneList[key].alleles.includes(alleleWithoutSide)) {
                geneName = key;
                return false;
            }
        });
        return geneName;
    }

    BiologicaX.findAllele = function(alleles, side, gene) {
        var allOptions = '(?:' + targetSpecies.geneList[gene].alleles.join('|') + ')';
        var regex = new RegExp(side + ':' + allOptions, '');
        return alleles.match(regex).toString();
    }

}).call(this);