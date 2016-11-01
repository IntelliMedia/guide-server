var parse = require('csv-parse');
var fs = require('fs');

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

exports.getConceptAdjustment = function(inheritancePattern, initial, selected, conceptId) {
    
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


