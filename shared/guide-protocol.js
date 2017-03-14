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
     * Event - information sent by the client (Geniverse) to the GUIDE ITS
     */
    GuideProtocol.Event = function(username, session, sequence, actor, action, target, context, time) {
        this.username = username;
        this.session = session;
        this.sequence = sequence;
        this.actor = actor;
        this.action = action;
        this.target = target;
        this.context = context;
        this.time = (time == null ? Date.now() : time);        
    }

    GuideProtocol.Event.Channel = 'Event';    

   GuideProtocol.Event.prototype.isMatch = function(actor, action, target) {
        return ((!actor || actor == '*' || actor == this.actor)
            && (!action || action == '*' || action == this.action)
            && (!target || target == '*' || target == this.target));
    }

    GuideProtocol.Event.prototype.toString = function() {
        return this.actor + "-" + this.action + "-" + this.target;
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
     * TutorDialog - used by the ITS to send a message to the student
     */
    GuideProtocol.TutorDialog = function(message, time) {

        if (message instanceof GuideProtocol.Text) {
           this.message = message;
        } else if (message instanceof String) {
            this.message = new GuideProtocol.Text(null, message);  
        } else if (message.hasOwnProperty('id') && message.hasOwnProperty('text') && message.hasOwnProperty('args')) {
            this.message = new GuideProtocol.Text(message.id, message.text, message.args);
        }

        this.time = (time == null ? Date.now() : time);        
    }

    GuideProtocol.TutorDialog.Channel = 'TutorDialog';     

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
        this.type = type;
        this.message = message;
        this.time = (time == null ? Date.now() : time);        
    } 

    GuideProtocol.Alert.Channel = 'Alert';

    GuideProtocol.Alert.Error = 'Error';
    GuideProtocol.Alert.Warning = 'Warning';
    GuideProtocol.Alert.Info = 'Info';    

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