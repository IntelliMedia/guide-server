#!/usr/bin/env node

/**
 * Simple Node.js script to turn a specific page on a Google Sheet
 * into a JSON object for the main purpose of HTML Templating.
 * based on https://gist.github.com/jonobr1/45fc5f41a219153aaa18
 * 
 * Usage:
 *  -i/--id           the Google Sheet ID found in the URL of your Google Sheet
 *  -s/--sheet        the Page ID of the Sheet you'd like to export -- `gid` in the URL
 *  -o/--output       the name of the output file
 */

const argv = require('minimist')(process.argv.slice(2));
var https = require('https');
var path = require('path');
var fs = require('fs');

var format = 'tsv';         // Format you'd like to parse. `tsv` or `csv`
var id = argv.i || argv.id;
var sheetId = argv.s || argv.sheet || 0;
var outFile = argv.o || argv.output || "sheet.json";

if (!id) {
  console.log("Google Spreadsheet ID required!");
  process.exit(1);
}

https.get(`https://docs.google.com/spreadsheets/d/${id}/export?format=${format}&id=${id}&gid=${sheetId}`,
function(resp) {

  var body = '';

  resp
    .on('data', function(data) {

      body += ab2str(data);

    })
    .on('end', function() {

      var json = [];
      var rows = body.split(/\r\n/i);

      for (var i = 0; i < rows.length; i++) {
        json.push(rows[i].split(/\t/i));
      }

      fs.writeFileSync(path.resolve(__dirname, `./${outFile}`), JSON.stringify(json, null, 2));
      console.log(`Generated ${outFile}`);

    });

});

function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint16Array(buf));
}
