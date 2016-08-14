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

    this.start = function() {
        if (running) return;
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

    this.addEvent = function(when, name, data) {
        events.push({when: when, name: name, args: data, cancel: noAction});
    }
}
util.inherits(Sequence, EventEmitter);


module.exports = Sequence;