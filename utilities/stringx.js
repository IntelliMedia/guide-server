String.prototype.splitAndTrim = function(delimiter) 
{
  return this.split(delimiter).map(function(item) {
    return item.trim();
  });
}

String.prototype.lowerCaseFirstChar = function() 
{
    return this.charAt(0).toLowerCase() + this.slice(1);
}

String.prototype.upperCaseFirstChar = function() 
{
    return this.charAt(0).toUpperCase() + this.slice(1);
}

String.prototype.trimThroughFirst = function(delimiter) 
{
    return this.substring(this.indexOf(delimiter) + 1);
}


// E.g., Foo-Bar -> fooBar
String.prototype.toCamelCase = function() {
    var words = this.split(/\s|_|-/);
    if (words.length > 0) {
    	words[0] = words[0].lowerCaseFirstChar();
      for(var i=1; i < words.length; ++i) {
    	words[i] = words[i].upperCaseFirstChar();
      }
    }
    
    return words.join("");
}

String.prototype.replaceLastWordInCamelCase = function(newWord) {
    for (var i = this.length-1; i >= 0; --i) {
      let c = this[i];
      if (c == c.toUpperCase()) {
        break;
      }
    }

    if (i < 0) {
      return newWord;
    } else {
      return this.substr(0, i) + newWord.upperCaseFirstChar();
    }
}

// First, checks if it isn't implemented yet.
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

// https://stackoverflow.com/questions/273789/is-there-a-version-of-javascripts-string-indexof-that-allows-for-regular-expr
String.prototype.regexIndexOf = function(regex, startpos) {
  var indexOf = this.substring(startpos || 0).search(regex);
  return (indexOf >= 0) ? (indexOf + (startpos || 0)) : indexOf;
}

String.prototype.regexLastIndexOf = function(regex, startpos) {
  regex = (regex.global) ? regex : new RegExp(regex.source, "g" + (regex.ignoreCase ? "i" : "") + (regex.multiLine ? "m" : ""));
  if(typeof (startpos) == "undefined") {
      startpos = this.length;
  } else if(startpos < 0) {
      startpos = 0;
  }
  var stringToWorkWith = this.substring(0, startpos + 1);
  var lastIndexOf = -1;
  var nextStop = 0;
  while((result = regex.exec(stringToWorkWith)) != null) {
      lastIndexOf = result.index;
      regex.lastIndex = ++nextStop;
  }
  return lastIndexOf;
}
