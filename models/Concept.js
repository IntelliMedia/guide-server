const parse = require('csv-parse');
const fs = require('fs');
const csvx = require('../utilities/csvx');

// Load Rules from CSV file during initialization
var concepts = null;
fs.readFile('data/Concepts.csv', 'utf8', function (err,data) {
    if (err) {
        throw err;
    }
    parse(data, {comment: '#'}, function(err, output){
        concepts = csvx.toObjectArray(output);     
    });    
});

exports.getAll = () => {
  return concepts;
}