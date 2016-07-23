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
    '4nt': function(bpm) { return new Interval(bpm, 2 / 3) },
    '8n': function(bpm) { return new Interval(bpm, 0.5) },
    '8nt': function(bpm) { return new Interval(bpm, 1 / 3) },
    '16n': function(bpm) { return new Interval(bpm, 0.25) },
};