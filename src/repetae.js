'use strict'

const EventEmitter = require('events'),
    util = require('util'),
    Repeater = require('./repeater.js');

function Repetae(repeater) {
    EventEmitter.call(this);
    var repetae = this;
    this._active = false;
    this._time_changed = false;
    this._being_pressed = false;
    repeater.on('interval', (interval) => repetae.emit('interval', interval))

    this.press = function() {
        repetae._being_pressed = true;
    }

    this.release = function() {
        var started_active = repetae._active,
            time_changed = repetae._time_changed;

        repetae._time_changed = false;
        repetae._being_pressed = false;

        switch (true) {
            case (!started_active):
                repetae._active = true;
                repetae.emit('on');
                break;
            case (started_active && !time_changed):
                repetae._active = false;
                repetae.emit('off');
                break;
        }
    }

    this.interval = function (amount_ms) {
        if (repetae._being_pressed) {
            repetae._time_changed = true;
            repeater.interval(amount_ms);
        }
    }

    this.start = function(callback) {
        if (!repetae._active) {
            callback();
            return;
        }
        repeater.start(callback);
    }

    this.stop = repeater.stop;
    this.report_interval = repeater.report_interval;
}
util.inherits(Repetae, EventEmitter);

// Adaptor function used to bind to web Audio API and utilise its audio-rate scheduling
Repetae.create_scheduled_by_audio_context = function(context, initial_interval) {
    return new Repetae(Repeater.create_scheduled_by_audio_context(context, initial_interval));
}

module.exports = Repetae;