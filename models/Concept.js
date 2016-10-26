var Concept = module.exports = {
  definitions: {
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
  all: function() {
    return Concept.definitions;
  }
}