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
    GuideProtocol.Event = function(studentId, session, actor, action, target, context, time) {
        this.studentId = studentId;
        this.session = session;
        this.sequence = -1;
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

    GuideProtocol.Event.prototype.toJson = function(replacer) {
        return JSON.stringify(this, replacer);
    }   

    GuideProtocol.Event.fromJson = function(json) {
        var obj = JSON.parse(json);
        var event = new GuideProtocol.Event(
            obj.studentId, 
            obj.session, 
            obj.actor, 
            obj.action, 
            obj.target, 
            obj.context,
            obj.time);

        // Copy over sequence number from original, if it exists
        if (obj.hasOwnProperty("sequence")) {
            event.sequence = parseInt(obj.sequence);
        }

        return event;
    }

    GuideProtocol.Event.fromJsonAsync = function(json) {
        return new Promise((resolve, reject) => {
            resolve(GuideProtocol.Event.fromJson(json));
        });
    } 

    /**
     * Alert Constants - used for system-level information, warning, and error messages
     */

    GuideProtocol.Alert = {
        Error: 'Error',
        Warning: 'Warning',
        Info: 'Info',
        Debug: 'Debug'  
    };

}).call(this);