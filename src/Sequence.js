'use strict'

const EventEmitter = require('events'),
    util = require('util');

function noAction() {}

function Sequence(Scheduling) {
    EventEmitter.call(this);
    let sequence = this
    let running = false
    let absoluteStartTime
    let restartEvent = {when: undefined, action: 'restart', cancel: noAction}
    let stopEvent = { when: 0, action: 'stop', cancel: noAction }

    let scheduleAllEvents = function(startTimeMs) {
        stopEvent.when = 0
        events.filter(occursBetween.bind(null, startTimeMs, restartEvent.when)).forEach((event) => {
            stopEvent.when = event.when > stopEvent.when ? event.when : stopEvent.when
            schedule(event)
        })
        schedule(restartEvent.when ? restartEvent : stopEvent)
    }

    let restart = function() {
        absoluteStartTime += restartEvent.when
        scheduleAllEvents(0);
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
                    sequence.emit(event.name, event.data);
                    break;
            }
        }, absoluteStartTime + event.when);
    }

    let currentPositionData = function() {
        let rightNow = Scheduling.nowMs()
        return {
            nowMs: rightNow,
            currentMs: absoluteStartTime > 0 ? rightNow - absoluteStartTime : 0
        }
    }

    let events = [];

    this.start = function(offsetMs) {
        offsetMs = offsetMs > 0 ? offsetMs : 0
        if (restartEvent.when) offsetMs = offsetMs % restartEvent.when
        absoluteStartTime = Scheduling.nowMs() - offsetMs
        if (running) {
            cancelAllEvents();
        }
        running = true;
        scheduleAllEvents(offsetMs);
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

    this.addEventAt = function(when, name, data) {
        events.push({when: when, name: name, data: data, cancel: noAction});
    }

    this.addEventNow = function(name, data) {
        let positionInfo = currentPositionData();
        if (absoluteStartTime === undefined) {
            absoluteStartTime = positionInfo.nowMs
        }
        events.push({when: positionInfo.currentMs, name: name, data: data, cancel: noAction})
    }

    this.currentPositionMs = function() {
        return currentPositionData().currentMs
    }

    this.loopLengthMs = function() {
        return restartEvent.when
    }

    this.reset = function() {
        sequence.stop();
        events = [];
        absoluteStartTime = undefined
        restartEvent.when = undefined
        stopEvent.when = 0
        sequence.emit('reset');
        return sequence;
    }

    this.scale = function(scaleFactor = 1) {
        if (scaleFactor < 0 || scaleFactor === 1) return sequence

        if (running) {
            cancelAllEvents()
        }

        events.forEach(event => event.when *= scaleFactor)
        if (restartEvent.when) restartEvent.when *= scaleFactor

        if (running) {
            let positionInfo = currentPositionData()
            let offsetMs = positionInfo.currentMs * scaleFactor
            absoluteStartTime = positionInfo.nowMs - offsetMs
            scheduleAllEvents(offsetMs)
        }
        return sequence
    }

    this.load = function(json) {
        sequence.stop(); // TODO should we be able to carry on if new sequence loaded?

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
    return {when: event.when, name: event.name, data: event.data};
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
