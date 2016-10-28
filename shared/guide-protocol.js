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
    GuideProtocol.Message = function(id, text, args) {
        this.id = id;
        this.text = text;
        this.args = (args ? args : {});        
    }

    GuideProtocol.Message.prototype.asString = function() {
        return this.text ? Mustache.render(this.text, this.args) : "";
    }      

    /**
     * Event message
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
     * TutorAction message
     */
    GuideProtocol.TutorAction = function(type, message, time) {

        // Tutor Action Types
        const Dialog = "Dialog";
        const Popup = "Popup";

        this.type = type;
        if (message instanceof GuideProtocol.Message) {
            this.message = message;
        } else {
            this.message = new GuideProtocol.Message(null, message);
        }
        this.time = (time == null ? Date.now() : time);        
    }

    GuideProtocol.TutorAction.prototype.toJson = function() {
        return JSON.stringify(this);
    }    

    GuideProtocol.TutorAction.fromJson = function(json) {
        var obj = JSON.parse(json);
        return new GuideProtocol.Event(
            obj.type, 
            obj.message, 
            obj.time);
    }

    GuideProtocol.TutorAction.fromJsonAsync = function(json) {
        return new Promise((resolve, reject) => {
            resolve(GuideProtocol.TutorAction.fromJson(json));
        });
    }    

}).call(this);