/**
 * This file contains methods that eXtend the Biologica.js library
 * https://github.com/concord-consortium/biologica.js
 *
 */

if (typeof exports === 'undefined') {
    var exports = window;
}

(function () {

    // Fix Biologica data structures to accept either "nose spike" or "nose"
    BioLogica.Species.Drake.geneList["nose spike"] = BioLogica.Species.Drake.geneList["nose"];
    BioLogica.Species.Drake.traitRules["nose"] = BioLogica.Species.Drake.traitRules["nose spike"];
    BioLogica.Species.Drake.geneList["colored"] = BioLogica.Species.Drake.geneList["color"];

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
            return capitalizeFirstLetter(sex);
        } else {
            return (sex == 0 ? "Male" : "Female");
        }
    }

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    BiologicaX.sexFromString = function(str) {
        // If sex is already a number, just return it.
        if (!isNaN(parseFloat(str))) {
            return str;
        } else {
            return (str && str.toLowerCase() === "male" ? 0 : 1);
        }
    }

    // To deal with inconsistent capitalization of sex
    BiologicaX.isSexEqual = function(sexL, sexR) {
        return BiologicaX.sexToString(sexL).toLowerCase()
            === BiologicaX.sexToString(sexR).toLowerCase();
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

    BiologicaX.getGene = function(species, alleles) {
        var geneName = null;
        var allelesWithoutSide = alleles.replace(/[ab]:/g, "");
        var alleleArray = allelesWithoutSide.split(",");

        for (let gene in species.geneList) {
            if (alleleArray.every((allele) =>
                species.geneList[gene].alleles.indexOf(allele) >= 0)) {
                    return gene;
                }
        }

        throw new Error("Unable to identify gene with alleles: " + alleles);
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

    BiologicaX.doesAttributeAffectCharacterisitic = function(species, attribute, characteristic) {
        if (!species.geneList.hasOwnProperty(attribute)) {
            return false;
        }

        let alleles = species.geneList[attribute].alleles;
        for (let trait in species.traitRules[characteristic]) {
            for (let traitAlleles of species.traitRules[characteristic][trait]) {
                if (BiologicaX.allelesInTraitArray(alleles, traitAlleles) == true) {
                    return true;
                }
            }
        }

        return false;
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
        // First check the most obvious comparison
        if (phenotype.hasOwnProperty(characteristic) &&
            phenotype[characteristic] == trait) {
            return true;
        }

        switch(trait) {
            case "Metallic":
                return BiologicaX.isColorMetallic(phenotype.color);
            case "Nonmetallic":
                return !BiologicaX.isColorMetallic(phenotype.color);
            case "Albino":
                return BiologicaX.isAlbino(phenotype.color);
            case "Color":
                return !BiologicaX.isAlbino(phenotype.color);
            case "Orange":
                return BiologicaX.isOrange(phenotype.color);
            case "Gray":
                return !BiologicaX.isOrange(phenotype.color);
        }

        return false;
    }

    BiologicaX.isBaseColor = function(color) {
        switch(color) {
            case "Metallic":
            case "Nonmetallic":
            case "Albino":
            case "Color":
            case "Orange":
            case "Gray":
                return true;
        }

        return false;
    }

    BiologicaX.findAllele = function(species, alleles, side, trait) {
        var allOptions = '(?:' + species.geneList[trait].alleles.join('|') + ')';
        var regex = new RegExp('(' + side + ':' + allOptions + ')(?:,|$)', '');
        var matches = alleles.match(regex);
        return (matches != null ? matches[1] : null)
    }

    BiologicaX.findAlleles = function(species, alleles, trait) {
        var allOptions = species.geneList[trait].alleles.join('|');
        var regex = new RegExp('([ab]:(' + allOptions + '))(?:,|$)', 'g');

        let match;
        let matches = [];
        while (match = regex.exec(alleles)) {
            matches.push(match[1]);
        }

        return matches.join(',');
    }

    BiologicaX.findAllelesForTraitWithoutSides = function(speciesName, alleles, trait) {
        var species = BioLogica.Species[speciesName];
        var allOptions = species.geneList[trait].alleles.join('|');
        var regex = new RegExp('(?:[ab]:)(' + allOptions + ')(?:,|$)', 'g');

        let match;
        let matches = [];
        while (match = regex.exec(alleles)) {
            matches.push(match[1]);
        }

        return matches;
    }

    BiologicaX.hasAttributeChanged = function(speciesName, currentAlleles, currentSex, previousAlleles, previousSex, attribute) {

        if (currentAlleles == null || currentSex == null) {
            throw new Error("Unable to detect change: missing current alleles or sex");
        }

        if (previousAlleles == null || previousSex == null) {
            throw new Error("Unable to detect change: missing previous alleles or sex");
        }

        let species = BioLogica.Species[speciesName];
        if (attribute === "sex") {
            return !BiologicaX.isSexEqual( currentSex, previousSex);
        } else {
            let currentAttributeAlleles = BiologicaX.findAlleles(species, currentAlleles, attribute);
            let previousAttributeAlleles = BiologicaX.findAlleles(species, previousAlleles, attribute);
            return (currentAttributeAlleles != previousAttributeAlleles);
        }
    }

    BiologicaX.numberOfMovesToCharacteristic = function(speciesName, alleles, sex, trait, characteristic) {

        let currentAlleles = BiologicaX.findAllelesForTraitWithoutSides(speciesName, alleles, trait);

        // Sex-linked traits can have only one allele if the wrong sex is selected
        // Push an Y onto alleles to avoid counting this as a move (it will match the
        // characteristic in the traitRules)
        if (currentAlleles.length < 2) {
            currentAlleles.push("Y");
        }

        currentAlleles.sort();

        let alleleTargets = BioLogica.Species[speciesName].traitRules[trait][characteristic];

        let minMoves = Number.MAX_SAFE_INTEGER;
        for (var alleleTarget of alleleTargets) {
            minMoves = Math.min(minMoves, BiologicaX.minimumMoves(currentAlleles, alleleTarget));
        }
        return minMoves;
    }

    BiologicaX.minimumMoves = function(alleles, targetAlleles) {
        var currentAlleles = alleles.slice().sort();
        targetAlleles.sort();

        if (alleles.length != targetAlleles.length) {
            throw new Error("Allele arrays must be the same length to compute minimum moves.");
        }

        var moves = 0;
        while(!currentAlleles.equals(targetAlleles)) {
            for(var i = 0; i < currentAlleles.length; ++i) {
                if (currentAlleles[i] != targetAlleles[i]) {
                    currentAlleles[i] = targetAlleles[i];
                    moves++;
                    break;
                }
            }
        }

        return moves;
    }

    BiologicaX.numberOfMovesToContributeToOffspringCharacteristic = function(
        speciesName,
        motherAlleles,
        fatherAlleles,
        trait,
        offspringCharacteristic) {

        let motherTraitAlleles = BiologicaX.findAllelesForTraitWithoutSides(speciesName, motherAlleles, trait);
        // Sex-linked traits can have only one allele if the wrong sex is selected
        // Push an Y onto alleles to avoid counting this as a move (it will match the
        // characteristic in the traitRules)
        if (motherTraitAlleles.length < 2) {
            motherTraitAlleles.push("Y");
        }
        motherTraitAlleles.sort();

        let fatherTraitAlleles = BiologicaX.findAllelesForTraitWithoutSides(speciesName, fatherAlleles, trait);
        // Sex-linked traits can have only one allele if the wrong sex is selected
        // Push an Y onto alleles to avoid counting this as a move (it will match the
        // characteristic in the traitRules)
        if (fatherTraitAlleles.length < 2) {
            fatherTraitAlleles.push("X");
        }
        fatherTraitAlleles.sort();

        let offspringAlleleTargets = BioLogica.Species[speciesName].traitRules[trait][offspringCharacteristic];

        let minMoves = Number.MAX_SAFE_INTEGER;
        for (var offspringAlleleTarget of offspringAlleleTargets) {
            minMoves = Math.min(minMoves, BiologicaX.minimumParentMoves(
                motherTraitAlleles,
                fatherTraitAlleles,
                offspringAlleleTarget));
        }
        return minMoves;
    }

    BiologicaX.minimumParentMoves = function(motherAlleles, fatherAlleles, offspringAlleles) {
        offspringAlleles.sort();

        if (motherAlleles.length != offspringAlleles.length
        || fatherAlleles.length != offspringAlleles.length) {
            throw new Error("Parent allele arrays must be the same length to compute minimum moves.");
        }

        // Can each parent contribute an allele to the target allele pattern?
        let moves = 0;
        if (!motherAlleles.includes(offspringAlleles[0])) { ++moves; }
        if (!fatherAlleles.includes(offspringAlleles[1])) { ++moves; }

        // Flip sides and see if parents can contribute to the "other" side
        let flippedSidesMove = 0;
        if (!motherAlleles.includes(offspringAlleles[1])) { ++flippedSidesMove; }
        if (!fatherAlleles.includes(offspringAlleles[0])) { ++flippedSidesMove; }

        return Math.min(moves, flippedSidesMove);
    }

    BiologicaX.canParentsProduceOffspringWithCharacteristic = function(
        speciesName,
        motherAlleles,
        fatherAlleles,
        trait,
        characteristic
    ) {
        var species = BioLogica.Species[speciesName];

        let parentsCanProduceOffspring = false;

        var alleleTargets = species.traitRules[trait][characteristic];
        for(var targetAlleles of alleleTargets) {
            var mother = BiologicaX.findAllelesForTraitWithoutSides(speciesName, motherAlleles, trait);
            mother.push("Y");
            var father = BiologicaX.findAllelesForTraitWithoutSides(speciesName, fatherAlleles, trait);
            mother.push("X");

            // Can each parent contribute an allele to the target allele pattern?
            let motherContributes = mother.includes(targetAlleles[0]);
            let fatherContributes = father.includes(targetAlleles[1]);

            if (motherContributes && fatherContributes) {
                parentsCanProduceOffspring = true;
                break;
            }

            // Flip sides and see if parents can contribute to the "other" side
            motherContributes = mother.includes(targetAlleles[1]);
            fatherContributes = father.includes(targetAlleles[0]);

            if (motherContributes && fatherContributes) {
                parentsCanProduceOffspring = true;
                break;
            }
        }

        return parentsCanProduceOffspring;
    }

    BiologicaX.whichParentDoesntContributeToOffspringWithCharacteristic = function(
        speciesName,
        motherAlleles,
        fatherAlleles,
        trait,
        characteristic
    ) {
        var species = BioLogica.Species[speciesName];

        let nonContributingParent = null;

        var alleleTargets = species.traitRules[trait][characteristic];
        for(var targetAlleles of alleleTargets) {
            var mother = BiologicaX.findAllelesForTraitWithoutSides(speciesName, motherAlleles, trait);
            mother.push("Y");
            var father = BiologicaX.findAllelesForTraitWithoutSides(speciesName, fatherAlleles, trait);
            mother.push("X");

            // Use random index selection so that the same parent isn't always the non-contributor
            // based on the ordering of the alleles in traitRules. For example:
            // 1) if both parents are [M,m] and the target is [m,m] one random parent needs to change
            // 2) if both parents are [M,M] and the target is [m,m] then both parents need to change
            // Random 0 or 1 (and 1-index will be the inverse: 1 or 0)
            let index = Math.round(Math.random());

            // Can each parent contribute an allele to the target allele pattern?
            let motherContributes = mother.includes(targetAlleles[index]);
            let fatherContributes = father.includes(targetAlleles[1-index]);

            if (!(motherContributes || fatherContributes)) {
                nonContributingParent = "both";
                break;
            } else if (!motherContributes) {
                nonContributingParent = "mother";
                break;
            } else if (!fatherContributes) {
                nonContributingParent = "father";
                break;
            }

            // Flip sides and see if parents can contribute to the "other" side
            motherContributes = mother.includes(targetAlleles[1-index]);
            fatherContributes = father.includes(targetAlleles[index]);

            if (!(motherContributes || fatherContributes)) {
                nonContributingParent = "both";
                break;
            } else if (!motherContributes) {
                nonContributingParent = "mother";
                break;
            } else if (!fatherContributes) {
                nonContributingParent = "father";
                break;
            }
        }

        return nonContributingParent;
    }

    BiologicaX.getTraitFromAlleles = function(species, alleles) {

        var allelesWithoutSide = alleles.map((allele) => allele.replace(/[ab]:/g, ""));

        for (let characteristic in species.traitRules) {
            for (let trait in species.traitRules[characteristic]) {
                for (let traitAlleles of species.traitRules[characteristic][trait]) {
                    if (BiologicaX.allelesInTraitArray(allelesWithoutSide, traitAlleles) == true) {
                        return trait;
                    }
                }
            }
        }

        throw new Error("Unable to identify trait from alleles: " + alleles);
    }

    BiologicaX.getCharacteristicFromTrait = function(species, trait) {
        var normalizedTrait = trait.toLowerCase();

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

        if (BiologicaX.isBaseColor(trait)) {
            return trait;
        }

        if (BiologicaX.doesAttributeAffectCharacterisitic(
            species,
            trait.toLowerCase(),
            "color")) {
                return "color";
            }

        throw new Error("Unabled to identify characteristic for: " + trait);
   }

   BiologicaX.allelesInTraitArray = function(targetAlleles, traitAlleles) {
       if (!targetAlleles || targetAlleles.length == 0 || !traitAlleles || traitAlleles.length == 0) {
           return false;
       }

       let clone = traitAlleles.slice(0);

       for (let allele of targetAlleles) {
           let alleleRegex = new RegExp("^" + allele + "$", '');
           let index = clone.findIndex(value => alleleRegex.test(value));
           //let index = regexIndexOf(clone, allele);
           if (index < 0) {
               return false;
           }
           clone.splice(index, 1);
       }

       return true;
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
        } else if (displayName === "one armor") {
            displayName = "partial armor";
        } else if (displayName === "no armor") {
            displayName = "no armor";
        } else if (displayName === "black") {
            displayName = "gray";
        } else if (displayName === "dilute") {
            displayName = "deep";
        } else if (displayName === "colored") {
            displayName = "color";
        }


        return displayName;
    }

    BiologicaX.getChallengeIdBase = function(challengeId) {
        // Trailing number on the challenge ID should be ignored since they
        // represent different trials of the same challenege
        return challengeId.replace(/-?\d*$/,"");
    }

    // TODO rgtaylor 2018-08-24 This "workaround" should be removed in the future.
    // Workarounds necessary because data from Geniventure doesn't match the species traitRules defined in Biologicajs
    BiologicaX.fixIncomingEvent = function(obj) {
        if (typeof obj != 'object') {
            return;
        }

        if (Array.isArray(obj)) {
            for (let item of obj) {
                BiologicaX.fixIncomingEvent(item);
            }
        } else {
            Object.keys(obj).forEach((key,index) => {
                if (key === "nose spike" && !obj.hasOwnProperty("nose")) {
                    obj["nose"] = obj["nose spike"]
                }
                BiologicaX.fixIncomingEvent(obj[key]);
            });
        }
    }

    // TODO rgtaylor 2018-09-21 This "workaround" should be removed in the future.
    // Workarounds necessary because data that Geniventure is expecting doesn't match the species
    // traitRules defined in Biologicajs.
    BiologicaX.fixOutgoingEvent = function(key, value) {
        if (key === "attribute" && value === "colored") {
            return "color";
        }
        return value;
    }

}).call(this);