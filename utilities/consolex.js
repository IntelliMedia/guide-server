exports.exception = function(ex) {
    var msg = "";
    if (ex.message) {
        msg += ex.message;
    }
    if (ex.stack) {
        msg += ' | stack: ' + ex.stack;
    }    
    console.error(msg);
}