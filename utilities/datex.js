if (!Date.prototype.toFilename) {
  (function() {

    function pad(number) {
      if (number < 10) {
        return '0' + number;
      }
      return number;
    }

    Date.prototype.toFilename = function() {
      return this.toISOString().replace(/:/g, "-");
    };

  }());
}