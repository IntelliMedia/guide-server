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
