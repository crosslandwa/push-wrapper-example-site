'use strict'

const EventEmitter = require('events'),
    util = require('util'),
    foreach = require('lodash.foreach'),
    noAction = function() {};

function Sequence(Scheduling) {
    EventEmitter.call(this);
    let sequence = this,
        running = false,
        schedule = function(event) {
            event.cancel = Scheduling.inTheFuture(() => {
                if (!running) return;
                if (event.action) {
                    event.action();
                } else {
                    sequence.emit(event.name, event.args);
                }
            }, event.when);
        },
        events = [];

    this.start = function(force) {
        if (!force && running) return;
        running = true;
        foreach(events, schedule);
    }

    this.stop = function() {
        running = false;
        foreach(events, (event) => {
            event.cancel();
            event.cancel = noAction;
        });
        sequence.emit('stopped');
    }

    this.loop = function(endTime) {
        let end = endTime > 0 ? endTime : undefined;

        if (end) {
            // TODO will need to hold reference to this if I want to turn off looping...
            events.push({when: endTime, action: function restart() { sequence.start(true); }, cancel: noAction})
        }
    }

    this.addEvent = function(when, name, data) {
        events.push({when: when, name: name, args: data, cancel: noAction});
    }
}
util.inherits(Sequence, EventEmitter);


module.exports = Sequence;