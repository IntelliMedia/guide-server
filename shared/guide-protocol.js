/**
 * This files defines data structures and functions used to
 * send messages (serialized as JSON) to and from the GUIDE ITS 
 * server.
 */

if (typeof exports === 'undefined') {
    var exports = window;
}

(function () {

    GuideProtocol = {};
    exports.GuideProtocol = GuideProtocol;    

    /** 
     * Message - string object with named substitution variables. 
     * NOTE: Requires mustache.js (https://github.com/janl/mustache.js/)
     */
    GuideProtocol.Text = function(id, text, args) {
        this.id = id;
        this.text = text;
        this.args = (args ? args : {});        
    }

    GuideProtocol.Text.prototype.asString = function() {
        return this.text ? Mustache.render(this.text, this.args) : "";
    }      

    /**
     * Event
     */
    GuideProtocol.Event = function(username, session, sequence, actor, action, target, context, time) {
        const Channel = 'Event';

        this.username = username;
        this.session = session;
        this.sequence = sequence;
        this.actor = actor;
        this.action = action;
        this.target = target;
        this.context = context;
        this.time = (time == null ? Date.now() : time);        
    }

    GuideProtocol.Event.prototype.toJson = function() {
        return JSON.stringify(this);
    }    

    GuideProtocol.Event.fromJson = function(json) {
        var obj = JSON.parse(json);
        return new GuideProtocol.Event(
            obj.username, 
            obj.session, 
            obj.sequence, 
            obj.actor, 
            obj.action, 
            obj.target, 
            obj.context,
            obj.time);
    }

    GuideProtocol.Event.fromJsonAsync = function(json) {
        return new Promise((resolve, reject) => {
            resolve(GuideProtocol.Event.fromJson(json));
        });
    }

    /**
     * TutorDialog
     */
    GuideProtocol.TutorDialog = function(message, time) {
        const Channel = 'TutorDialog';

        if (message instanceof GuideProtocol.Text) {
            this.message = message;
        } else {
            this.message = new GuideProtocol.Text(null, message);
        }
        this.time = (time == null ? Date.now() : time);        
    }

    GuideProtocol.TutorDialog.prototype.toJson = function() {
        return JSON.stringify(this);
    }    

    GuideProtocol.TutorDialog.fromJson = function(json) {
        var obj = JSON.parse(json);
        return new GuideProtocol.TutorDialog(
            obj.message, 
            obj.time);
    }

    GuideProtocol.TutorDialog.fromJsonAsync = function(json) {
        return new Promise((resolve, reject) => {
            resolve(GuideProtocol.TutorDialog.fromJson(json));
        });
    } 

    /**
     * Alert - used for system-level information, warning, and error messages
     */
    GuideProtocol.Alert = function(type, message, time) {
        const Channel = 'Alert';

        const Error = 'Error';
        const Warning = 'Warning';
        const Info = 'Info';

        this.type = type;
        this.message = message;
        this.time = (time == null ? Date.now() : time);        
    }

    GuideProtocol.Alert.prototype.toJson = function() {
        return JSON.stringify(this);
    }    

    GuideProtocol.Alert.fromJson = function(json) {
        var obj = JSON.parse(json);
        return new GuideProtocol.Alert(
            obj.type,
            obj.message, 
            obj.time);
    }

    GuideProtocol.Alert.fromJsonAsync = function(json) {
        return new Promise((resolve, reject) => {
            resolve(GuideProtocol.Alert.fromJson(json));
        });
    }        

}).call(this);