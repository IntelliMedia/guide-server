exports.toObjectArray = (csv) => {
  var objectArray = [];

  var rowCount = (csv != null ? csv.length : 0);
  // Assume row zero contains headings
  for (var i = 1; i < rowCount; ++i) {
    var row = csv[i];
    var obj = {};
    var columnCount = csv[0].length;
    for (var j = 0; j < columnCount; ++j) {
      var heading = csv[0][j];
      obj[heading] = row[j];
    }
    objectArray.push(obj);
  }

  return objectArray;
}