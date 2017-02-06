const parse = require('csv-parse');
const fs = require('fs');
const csvx = require('../utilities/csvx');

// Load Rules from CSV file during initialization
var concepts = null;
fs.readFile('data/Concepts.csv', 'utf8', function (err,data) {
    if (err) {
        return console.log(err);
    }
    parse(data, {comment: '#'}, function(err, output){
        concepts = csvx.toObjectArray(output);
        //console.log(conceptMatrix);        
    });    
});

exports.getAll = () => {
  return concepts;
}