
window.onload = function() {
    try {
        console.info("Connect using socket.io");
        let socket = io.connect();
        socket.on('status', (type, msg) => {
            flash(type, msg);
        });
        
        function flash(type, msg) {
            $('#alertMessage').text(msg);
            $('#alert').addClass('alert-' + type);
            $('#alert').removeClass('hide');
        }
    } catch(err) {
        console.error("Unable to connect", err);
    }
}