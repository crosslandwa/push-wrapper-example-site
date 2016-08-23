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
        events.filter(isWithinLoop.bind(null, offsetMs, restartEvent.when)).forEach(schedule.bind(null, offsetMs));

        console.log(events.filter(isWithinLoop.bind(null, offsetMs, restartEvent.when)))
        console.log('domne')
        if (restartEvent.when) schedule(offsetMs, restartEvent);
    }
    let restart = function() {
        startedTimeMs += restartEvent.when
        scheduleAllEvents(true, 0);
    }
    let cancelAllEvents = function() {
        events.forEach(cancel);
        cancel(restartEvent);
    }
    let schedule = function(offsetMs, event) {
        let startTime = startedTimeMs
        console.log('loop started at ' + startTime)
        let scheduledTimeMs = startedTimeMs + event.when - offsetMs
        console.log('scheduled at ' + (scheduledTimeMs - startTime))
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
        startedTimeMs = Scheduling.nowMs()
        scheduleAllEvents(false, offsetMs > 0 ? offsetMs : 0);
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
