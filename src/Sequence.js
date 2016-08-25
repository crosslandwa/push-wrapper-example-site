'use strict'

const EventEmitter = require('events'),
    util = require('util');

function noAction() {}

function Sequence(Scheduling) {
    EventEmitter.call(this);
    let sequence = this
    let running = false
    let sequenceAbsoluteStartTimeMs
    let restartEvent = {when: undefined, action: 'restart', cancel: noAction}
    let stopEvent = { when: 0, action: 'stop', cancel: noAction }

    let scheduleAllEvents = function(force, startTimeMs) {
        if (running) {
            cancelAllEvents();
        };
        running = true;
        stopEvent.when = 0
        events.filter(occursBetween.bind(null, startTimeMs, restartEvent.when)).forEach((event) => {
            stopEvent.when = event.when > stopEvent.when ? event.when : stopEvent.when
            schedule(event)
        })
        schedule(restartEvent.when ? restartEvent : stopEvent)
    }

    let restart = function() {
        sequenceAbsoluteStartTimeMs += restartEvent.when
        scheduleAllEvents(true, 0);
    }

    let cancelAllEvents = function() {
        events.forEach(cancel);
        cancel(restartEvent);
        cancel(stopEvent);
    }

    let schedule = function(event) {
        event.cancel = Scheduling.atATime(() => {
            switch (event.action) {
                case 'restart':
                    restart();
                    break;
                case 'stop':
                    sequence.stop();
                    break;
                default:
                    sequence.emit(event.name, event.args);
                    break;
            }
        }, sequenceAbsoluteStartTimeMs + event.when);
    }
    let events = [];

    this.start = function(offsetMs) {
        let sanitizedOffsetMs = offsetMs > 0 ? offsetMs : 0
        sequenceAbsoluteStartTimeMs = Scheduling.nowMs() - sanitizedOffsetMs + (sequenceAbsoluteStartTimeMs ? sequenceAbsoluteStartTimeMs : 0)
        scheduleAllEvents(sanitizedOffsetMs);
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
        stopEvent.when = 0
        sequence.emit('reset');
        return sequence;
    }

    this.scale = function(scaleFactor) {
        if (!scaleFactor || scaleFactor <= 0) return sequence

        let currentPositionMs = Scheduling.nowMs() - sequenceAbsoluteStartTimeMs
        let offsetMs = currentPositionMs * scaleFactor
        sequenceAbsoluteStartTimeMs = sequenceAbsoluteStartTimeMs + offsetMs

        if (running) {
            cancelAllEvents()
        }

        events.forEach(event => event.when *= scaleFactor)
        if (restartEvent.when) restartEvent.when *= scaleFactor

        if (running) {
            scheduleAllEvents(offsetMs)
        }
        return sequence
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

function isAfter(timeMs, event) {
    return event.when >= timeMs;
}

function isBefore(event, endMs) {
    return (typeof endMs === 'undefined') ? true : event.when < endMs;
}

function occursBetween(startMs, endMs, event) {
    return isAfter(startMs, event) && isBefore(event, endMs);
}

function cancel(event) {
    event.cancel();
    event.cancel = noAction;
}

module.exports = Sequence;
