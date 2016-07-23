'use strict'

const EventEmitter = require('events'),
    util = require('util'),
    Repeater = require('./repeater.js');

function Repetae(repeater, initial_interval) {
    EventEmitter.call(this);
    var repetae = this;
    this._active = false;
    this._time_changed = false;
    this._being_pressed = false;
    this._current_interval = initial_interval;

    repetae._current_interval.on('changed', repeater.interval);
    repetae._current_interval.report();

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

    this.interval = function(new_interval) {
        if (repetae._being_pressed) {
            repetae._time_changed = true;
            repetae._current_interval.removeListener('changed', repeater.interval);
            repetae._current_interval = new_interval;
            repetae._current_interval.on('changed', repeater.interval);
            repetae.report_interval();
            repetae._current_interval.report();
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
    this.report_interval = function() { repetae.emit('interval', repetae._current_interval.value)  };
}
util.inherits(Repetae, EventEmitter);

module.exports = Repetae;