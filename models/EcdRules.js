const biologica = require('../shared/biologica.js');
const biologicaX = require('../shared/biologicax.js');
const concept = require('../models/Concept');
const parse = require('csv-parse');
const fs = require('fs');

// Load Rules from CSV file during initialization
var conceptMatrix = null;
fs.readFile('data/ECD-Dominant-Rules.csv', 'utf8', function (err,data) {
    if (err) {
        return console.log(err);
    }
    parse(data, {comment: '#'}, function(err, output){
        conceptMatrix = output;
        //console.log(conceptMatrix);        
    });    
});

var EcdRules = module.exports = {
  updateStudentModel: function(student, caseId, challenegeId, editableGenes, speciesName, initialAlleles, currentAlleles, targetAlleles, targetSex) {

    var targetSpecies = BioLogica.Species[speciesName];
    var targetOrganism = new BioLogica.Organism(targetSpecies, targetAlleles, targetSex);
    console.log('targetOrganism alleles: ' + targetOrganism.getAlleleString());
    console.log('targetOrganism : ' + targetOrganism.getAlleleString());

    var conceptIdToTrait = {};
    var genesLength = editableGenes.length;
    for (var i = 0; i < genesLength; ++i) {
      var gene = editableGenes[i];
      var initial = BiologicaX.getAlleleAsInheritancePattern(targetSpecies, initialAlleles, gene);
      var selected = BiologicaX.getAlleleAsInheritancePattern(targetSpecies, currentAlleles, gene);

      var concepts = concept.getAll();
      var conceptIds = concepts.map(function(a) {return a.Id;});
      conceptIds.forEach(function (conceptId) {
        var targetInheritancePattern = BiologicaX.getInheritancePatternForGene(targetOrganism, gene);
        var adjustment = getConceptAdjustment(targetInheritancePattern, initial, selected, conceptId);
        console.log('Adjust concept "' + conceptId + '" by ' + adjustment);            
        var conceptState = student.conceptState(conceptId);
        conceptState.value += adjustment;   
        if (adjustment != null && adjustment < 0) {
          if (!conceptIdToTrait.hasOwnProperty(conceptId)) {
            conceptIdToTrait[conceptId] = {
              trait: gene,
              adjustment: 0
            };  
          }
          if (adjustment < conceptIdToTrait[conceptId].adjustment) {
            conceptIdToTrait[conceptId].adjustment = adjustment;
          }
        }
      });      
    }

    return conceptIdToTrait;
  }
}

function getConceptAdjustment(inheritancePattern, initial, selected, conceptId) {
    
    //console.log('inheritancePattern:' + inheritancePattern + '  initial:' + initial + '  selected:' + selected + '  conceptId:' + conceptId);

    var inheritancePatternIndex = -1;
    var initialIndex = -1;
    var selectedIndex = -1;
    var conceptIdIndex = -1;
    var columnCount = conceptMatrix[0].length;
    for (var i = 0; i < columnCount; ++i) {
        var header = conceptMatrix[0][i];
        if (header == 'InheritancePattern') {
            inheritancePatternIndex = i;
        }
        else if (header == 'InitialAllele') {
            initialIndex = i;
        }
        else if (header == 'Move') {
            selectedIndex = i;
        }    
        else if (header == conceptId) {
            conceptIdIndex = i;
        }                    
    }

    if (conceptIdIndex < 0) {
        console.warn('No adjustment defined for: ' + conceptId);
        return 0;
    }

    var rowCount = conceptMatrix.length;
    for (var i = 1; i < rowCount; ++i) {
        var row = conceptMatrix[i];
        if (row[inheritancePatternIndex] == inheritancePattern 
            && row[initialIndex] == initial
            && row[selectedIndex] == selected) {
                return (row[conceptIdIndex] ? Number(row[conceptIdIndex]) : 0);
            }
    }

    return 0;
}