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
     * Event message
     */
    GuideProtocol.Event = function(username, session, time, sequence, actor, action, target, context) {
        this.username = username;
        this.session = session;
        this.time = time;
        this.sequence = sequence;
        this.actor = actor;
        this.action = action;
        this.target = target;
        this.context = context;
    }

    GuideProtocol.Event.prototype.toJson = function() {
        return JSON.stringify(this);
    }    

    GuideProtocol.Event.fromJson = function(json) {
        var obj = JSON.parse(json);
        return new GuideProtocol.Event(
            obj.username, 
            obj.session, 
            obj.time, 
            obj.sequence, 
            obj.actor, 
            obj.action, 
            obj.target, 
            obj.context);
    }

    GuideProtocol.Event.fromJsonAsync = function(json) {
        return new Promise((resolve, reject) => {
            resolve(GuideProtocol.Event.fromJson(json));
        });
    }

}).call(this);