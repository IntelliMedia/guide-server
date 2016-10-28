const biologica = require('../shared/biologica.js');
const biologicaX = require('../shared/biologicax.js');

var EcdRules = module.exports = {
  rules: {
    'PC 3-B.1' : {
      'description': 'It only takes one dominant allele to result in dominant trait (wW or WW --> Dominant Phenotype)'
    },
    'PC 3-B.1-a' : {
      'description': 'A dominant allele will mask the presence of the recessive allele in the external phenotype, resulting in dominant phenotype (wW --> Dominant Phenotype)'
    },
    'PC 3-B.1-b' : {
      'description': 'If both alleles are dominant, this will result in a dominant phenotype (WW --> Dominant Phenotype)'
    },
    'PC 3-B.3' : {
      'description': 'Recessive trait can only occur with two recessive alleles (ww --> Recessive Phenotype)'
    }            
  },
  updateStudentModel: function(student, caseId, challenegeId, editableGenes, initialAlleles, currentAlleles) {

    var targetOrganism = new BioLogica.Organism(biologica.BioLogica.Species.Drake, "", 0);
    console.log('targetOrganism: ' + targetOrganism.getAlleleString());

    var conceptState = student.conceptState('PC 3-B.1-b');
    conceptState.value++;

  }
}