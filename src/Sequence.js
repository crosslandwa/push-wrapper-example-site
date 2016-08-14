'use strict'

const EventEmitter = require('events'),
    util = require('util'),
    foreach = require('lodash.foreach'),
    noAction = function() {};

function Sequence(Scheduling) {
    EventEmitter.call(this);
    let sequence = this,
        running = false,
        doStart = function(force) {
            if (!force && running) return;
            running = true;
            foreach(events, schedule);
        },
        restart = function() {
            doStart(true);
        },
        schedule = function(event) {
            event.cancel = Scheduling.inTheFuture(() => {
                if (!running) return;
                if (event.action) {
                    switch (event.action) {
                        case 'restart':
                            restart();
                            break;
                    }
                } else {
                    sequence.emit(event.name, event.args);
                }
            }, event.when);
        },
        events = [];

    this.start = function() {
        doStart(false);
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
            events.push({when: endTime, action: 'restart', cancel: noAction})
        }
    }

    this.addEvent = function(when, name, data) {
        events.push({when: when, name: name, args: data, cancel: noAction});
    }

    this.load = function(json) {
        events = json.map((event) => {
            let newEvent = mapEvent(event);
                newEvent.cancel = noAction;
            return newEvent;
        });

        return sequence;
    }

    this.toJSON = function() {
        return events.map(mapEvent);
    }
}
util.inherits(Sequence, EventEmitter);

function mapEvent(event) {
    let newEvent = {when: event.when};
    if (event.action) {
        newEvent.action = event.action;
    } else {
        newEvent.name = event.name;
        newEvent.args = event.args;
    }
    return newEvent;
}


module.exports = Sequence;