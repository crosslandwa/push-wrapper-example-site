'use strict'

const EventEmitter = require('events'),
    util = require('util'),
    foreach = require('lodash.foreach');

function Interval(bpm, multiplier) {
    EventEmitter.call(this);
    let current = 120,
        interval = this;

    bpm.on('changed', (bpm) => {
        interval.emit('changed', (60 / bpm) * multiplier * 1000);
    });
}
util.inherits(Interval, EventEmitter);

module.exports = {
    '4n': function(bpm) { return new Interval(bpm, 1) },
    '16n': function(bpm) { return new Interval(bpm, 0.25) },
};