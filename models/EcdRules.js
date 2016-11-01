const biologica = require('../shared/biologica.js');
const biologicaX = require('../shared/biologicax.js');
const moveEvaluator = require('../controllers/moveEvaluator.js');
const concept = require('../models/Concept');

var EcdRules = module.exports = {
  updateStudentModel: function(student, caseId, challenegeId, editableGenes, speciesName, initialAlleles, currentAlleles, targetAlleles, targetSex) {

    var targetSpecies = BioLogica.Species[speciesName];
    var targetOrganism = new BioLogica.Organism(targetSpecies, targetAlleles, targetSex);
    console.log('targetOrganism alleles: ' + targetOrganism.getAlleleString());
    console.log('targetOrganism : ' + targetOrganism.getAlleleString());

    var genesLength = editableGenes.length;
    for (var i = 0; i < genesLength; ++i) {
      var gene = editableGenes[i];
      var initial = BiologicaX.getAlleleAsInheritancePattern(targetSpecies, initialAlleles, gene);
      var selected = BiologicaX.getAlleleAsInheritancePattern(targetSpecies, currentAlleles, gene);

      var concepts = concept.all();
      var conceptIds = Object.keys(concepts);
      conceptIds.forEach(function (conceptId) {
        var targetInheritancePattern = BiologicaX.getInheritancePatternForGene(targetOrganism, gene);
        var adjustment = moveEvaluator.getConceptAdjustment(targetInheritancePattern, initial, selected, conceptId);
        console.log('Adjust concept "' + conceptId + '" by ' + adjustment);            
        var conceptState = student.conceptState(conceptId);
        conceptState.value += adjustment;        
      });      
    }
  }
}