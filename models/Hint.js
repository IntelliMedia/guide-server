const parse = require('csv-parse');
const fs = require('fs');
const csvx = require('../utilities/csvx');

// Load Rules from CSV file during initialization
var lookup = {};
var hints = null;
fs.readFile('data/Hints.csv', 'utf8', function (err,data) {
    if (err) {
        return console.log(err);
    }
    parse(data, {comment: '#'}, function(err, output){
        hints = csvx.toObjectArray(output);
        for (var i = 0, len = hints.length; i < len; i++) {
            lookup[hints[i].Id] = hints[i];
        }
        //console.log(conceptMatrix);        
    });    
});

exports.getHint = (id, previousHintLevel) => {
    var hintLevel = (previousHintLevel != null ? previousHintLevel : -1) + 1;
    var message = findHint(id, hintLevel);
    if (message != null) {
        return {
            message: message,
            level: hintLevel
        };
    } else {
        return null;
    }

}

function findHint(conceptId, level) {
    if (level == 0) {
        switch(Math.floor(Math.random() * 6)) {
            case 0:
                return "That's not quite it. Try again.";
            break;
            case 1:
                return "Energy and persistence conquer all things.\n - Benjamin Franklin";
            break;
            case 2:
                return "Persistence and resilience only come from having been given the chance to work though difficult problems.\n - Gever Tulley";
            break;
            case 3:
                return "Patience, persistence and perspiration make an unbeatable combination for success.\n - Napoleon Hill";
            break; 
            case 4:
                return "Success is not the absence of failure; it's the persistence through failure.\n - Aisha Tyler";
            break;
            case 5:
                return "The most important skill is persistence.";
            break;                                    
            default:
            action = null;
        }  
    } else {
        var hint = lookup[conceptId];
        if (hint != null) {
            var propertyName = "Hint-" + level;
            if (hint.hasOwnProperty(propertyName)) { 
                return hint[propertyName];
            }
        }
    }

    return null;
}