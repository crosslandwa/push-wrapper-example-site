'use strict'

const EventEmitter = require('events'),
    util = require('util'),
    noAction = function() {};

function Sequence(Scheduling) {
    EventEmitter.call(this);
    let sequence = this,
        running = false,
        restartEvent = {when: undefined, action: 'restart', cancel: noAction},
        scheduleAllEvents = function(force, offsetMs) {
            if (!force && running) return;
            running = true;
            events.filter(isWithinLoop.bind(null, offsetMs, restartEvent.when)).forEach(schedule.bind(null, offsetMs));
            if (restartEvent.when) schedule(offsetMs, restartEvent);
        },
        restart = function() {
            scheduleAllEvents(true, 0);
        },
        cancelAllEvents = function() {
            events.forEach(cancel);
            cancel(restartEvent);
        },
        schedule = function(offsetMs, event) {
            event.cancel = Scheduling.inTheFuture(() => {
                switch (event.action) {
                    case 'restart':
                        restart();
                        break;
                    default:
                        sequence.emit(event.name, event.args);
                        break;
                }
            }, event.when - offsetMs);
        },
        events = [];

    this.start = function(offsetMs) {
        scheduleAllEvents(false, offsetMs > 0 ? offsetMs : 0);
        return sequence;
    }

    this.stop = function() {
        let emitStopped = running;
        running = false;
        cancelAllEvents();
        if (emitStopped) sequence.emit('stopped');
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

    this.reset = function() {
        sequence.stop();
        events = [];
        restartEvent.when = undefined;
        sequence.emit('reset');
        return sequence;
    }

    this.load = function(json) {
        cancelAllEvents();

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

function isAfterStart(event, startOffsetMs) {
    return event.when >= startOffsetMs;
}

function isBeforeLoopEnd(loopEndMs, event) {
    return (typeof loopEndMs === 'undefined') ? true : event.when < loopEndMs;
}

function isWithinLoop(startOffsetMs, loopEndMs, event) {
    return isAfterStart(event, startOffsetMs) && isBeforeLoopEnd(loopEndMs, event);
}

function cancel(event) {
    event.cancel();
    event.cancel = noAction;
}

module.exports = Sequence;
