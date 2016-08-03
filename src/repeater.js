'use strict'

const EventEmitter = require('events'),
    util = require('util');
/*
Repeatedly calls the passed callback at the specified interval until told to stop
*/
function Repeater(setTimeout, initial_interval) {
    EventEmitter.call(this);
    var repeater = this;
    this._is_scheduling = false;
    this._interval = initial_interval > 20 ? initial_interval : 500; // ms

    this.interval = function (amount_ms) {
        repeater._interval = amount_ms > 20 ? amount_ms : 20; // 20ms min interval
        repeater.report_interval();
    }

    this.start = function(callback) {
        if (repeater._is_scheduling) return;
        repeater._is_scheduling = true;
        callback();
        this._recursiveSetTimeout(callback);
    }

    this._recursiveSetTimeout = function(callback) {
        setTimeout(() => {
            if (repeater._is_scheduling) {
                callback();
                this._recursiveSetTimeout(callback);
            }
        }, repeater._interval)
    }

    this._call_and_reschedule = function(callback) {
        if (repeater._is_scheduling) {
            callback();
            scheduled_execution(() => repeater._call_and_reschedule(callback), repeater._interval);
        };
    }

    this.stop = function() {
        repeater._is_scheduling = false;
    }

    this.report_interval = function() {
        repeater.emit('interval', repeater._interval);
    }
}
util.inherits(Repeater, EventEmitter);

function AudioSetTimeout(context) {
    this.setTimeout = function(callback, time_ms) {
        let source = context.createBufferSource(),
            now = context.currentTime,
            thousandth = context.sampleRate / 1000,
            scheduled_at = now + (time_ms / 1000) - 0.001;
        // a buffer length of 1 sample doesn't work on IOS, so use 1/1000th of a second
        let buffer = context.createBuffer(1, thousandth, context.sampleRate);
        source.addEventListener('ended', callback);
        source.buffer = buffer;
        source.connect(context.destination);
        source.start(scheduled_at);
    }
}

// Adaptor function used to bind to web Audio API and utilise its audio-rate scheduling
Repeater.create_scheduled_by_audio_context = function(context, initial_interval) {
    return new Repeater(new AudioSetTimeout(context).setTimeout, initial_interval);
}

module.exports = Repeater;