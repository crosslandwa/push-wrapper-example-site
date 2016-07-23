'use strict'

const EventEmitter = require('events'),
    util = require('util'),
    foreach = require('lodash.foreach');

function Interval(bpm, multiplier, value) {
    EventEmitter.call(this);
    let interval = this;

    this.value = value;
    this.report = function() { interval.emit('changed', (60 / bpm.current) * multiplier * 1000); };

    bpm.on('changed', interval.report);
}
util.inherits(Interval, EventEmitter);

module.exports = {
    '4n': function(bpm) { return new Interval(bpm, 1, '4n') },
    '4nt': function(bpm) { return new Interval(bpm, 2 / 3, '4nt') },
    '8n': function(bpm) { return new Interval(bpm, 0.5, '8n') },
    '8nt': function(bpm) { return new Interval(bpm, 1 / 3, '8nt') },
    '16n': function(bpm) { return new Interval(bpm, 0.25, '16n') },
    '16nt': function(bpm) { return new Interval(bpm, 1 / 6, '16nt') },
    '32n': function(bpm) { return new Interval(bpm, 0.125, '32n') },
    '32nt': function(bpm) { return new Interval(bpm, 1 / 12, '32nt') },
};