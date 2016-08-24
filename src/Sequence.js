'use strict'

const EventEmitter = require('events'),
    util = require('util'),
    noAction = function() {};

function Sequence(Scheduling) {
    EventEmitter.call(this);
    let sequence = this
    let running = false
    let startedTimeMs
    let restartEvent = {when: undefined, action: 'restart', cancel: noAction}
    let scheduleAllEvents = function(force, offsetMs) {
        if (!force && running) return;
        running = true;
        events.filter(isWithinLoop.bind(null, offsetMs, restartEvent.when)).forEach(schedule);
        if (restartEvent.when) schedule(restartEvent);
    }
    let restart = function() {
        startedTimeMs += restartEvent.when
        scheduleAllEvents(true, 0);
    }
    let cancelAllEvents = function() {
        events.forEach(cancel);
        cancel(restartEvent);
    }
    let schedule = function(event) {
        let startTime = startedTimeMs
        let scheduledTimeMs = startedTimeMs + event.when
        event.cancel = Scheduling.atATime(() => {
            switch (event.action) {
                case 'restart':
                    restart();
                    break;
                default:
                    sequence.emit(event.name, event.args);
                    break;
            }
        }, scheduledTimeMs);
    }
    let events = [];

    this.start = function(offsetMs) {
        let sanitizedOffsetMs = offsetMs > 0 ? offsetMs : 0
        startedTimeMs = Scheduling.nowMs() - sanitizedOffsetMs
        scheduleAllEvents(false, sanitizedOffsetMs);
        return sequence;
    }

    this.stop = function() {
        let emitStopped = running;
        running = false;
        cancelAllEvents();
        if (emitStopped) sequence.emit('stopped');
    }

    this.loop = function(endTimeMs) {
        let end = endTimeMs > 0 ? endTimeMs : undefined;
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
        sequence.stop(); // TODO should we be able to carry on if new sequence loaded? or should we have separate method to change loop length + event timings

        events = json.events.map((event) => {
            let newEvent = mapEventForJSONification(event);
            newEvent.cancel = noAction;
            return newEvent;
        });

        restartEvent.when = json.loop.lengthMs > 0 ? json.loop.lengthMs : undefined
        restartEvent.cancel = noAction;

        return sequence;
    }

    this.toJSON = function() {
        return {
            loop: { lengthMs: restartEvent.when },
            events: events.map(mapEventForJSONification)
        };
    }
}
util.inherits(Sequence, EventEmitter);

function mapEventForJSONification(event) {
    return {when: event.when, name: event.name, args: event.args};
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
