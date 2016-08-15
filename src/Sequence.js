'use strict'

const EventEmitter = require('events'),
    util = require('util'),
    noAction = function() {};

function Sequence(Scheduling) {
    EventEmitter.call(this);
    let sequence = this,
        running = false,
        restartEvent = {when: undefined, action: 'restart', cancel: noAction},
        doStart = function(force) {
            if (!force && running) return;
            running = true;
            events.filter((event) => {
                return (typeof restartEvent.when === 'undefined') ? true : event.when < restartEvent.when;
            }).forEach(schedule);
            if (restartEvent.when) schedule(restartEvent);
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
        return sequence;
    }

    this.stop = function() {
        running = false;
        events.forEach((event) => {
            event.cancel();
            event.cancel = noAction;
        });
        sequence.emit('stopped');
    }

    this.loop = function(endTime) {
        let end = endTime > 0 ? endTime : undefined;

        if (end) {
            restartEvent.when = end;
        }
        return sequence;
    }

    this.addEvent = function(when, name, data) {
        events.push({when: when, name: name, args: data, cancel: noAction});
    }

    this.load = function(json) {
        // TODO cancel all current events before loading new

        events = json.events.map((event) => {
            let newEvent = mapEvent(event);
                newEvent.cancel = noAction;
            return newEvent;
        });

        restartEvent = json.loop;
        restartEvent.cancel = noAction;

        return sequence;
    }

    this.toJSON = function() {
        return {
            loop: mapEvent(restartEvent),
            events: events.map(mapEvent)
        };
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