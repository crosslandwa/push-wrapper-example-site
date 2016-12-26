'use strict'

const EventEmitter = require('events'),
    util = require('util'),
    Scheduling = require('wac.scheduling');

function Repetae(repeater, intervals) {
    EventEmitter.call(this);
    let repetae = this;
    let _active = false;
    let _time_changed = false;
    let _being_pressed = false;
    let _current_interval = intervals[0]

    repeater.on('interval', (interval) => { repetae.emit('intervalMs', interval) })
    _current_interval.on('changed', repeater.updateInterval);
    _current_interval.report();

    this.press = function() {
        _being_pressed = true;
    }

    this.release = function() {
        var started_active = _active;
        let time_changed = _time_changed;

        _time_changed = false;
        _being_pressed = false;

        switch (true) {
            case (!started_active):
                _active = true;
                repetae.emit('on');
                break;
            case (started_active && !time_changed):
                _active = false;
                repetae.emit('off');
                break;
        }
    }

    this.interval = function(new_interval_name) {
        let newInterval = intervals.filter(interval => interval.value() === new_interval_name)
        if (_being_pressed && newInterval) {
            _time_changed = true;
            _current_interval.removeListener('changed', repeater.updateInterval);
            _current_interval = newInterval[0];
            _current_interval.on('changed', repeater.updateInterval);
            repetae.report_interval();
            _current_interval.report();
        }
    }

    this.start = function(callback) {
        if (!_active) {
            callback();
            return;
        }
        repeater.start(callback);
    }

    this.stop = repeater.stop;
    this.report_interval = () => repetae.emit('interval', _current_interval.value());
}
util.inherits(Repetae, EventEmitter);

module.exports = function createRepetae(intervals, context) {
    let repeater = Scheduling(context).Repeater(1000); // initial interval here will be changed when Repetae initialises
    return new Repetae(repeater, intervals);
};
