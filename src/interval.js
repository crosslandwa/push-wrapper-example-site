'use strict'

const EventEmitter = require('events'),
    util = require('util');

function Interval(bpm, multiplier, value) {
    EventEmitter.call(this);
    let interval = this;

    this.value = value;
    this.report = function() { interval.emit('changed', bpm.beatLength().toMs() * multiplier); };

    bpm.on('changed', interval.report);
}
util.inherits(Interval, EventEmitter);

module.exports = {
    '4n': function(bpm, name) { return new Interval(bpm, 1, name ? name : '4n') },
    '4nt': function(bpm, name) { return new Interval(bpm, 2 / 3, name ? name : '4nt') },
    '8n': function(bpm, name) { return new Interval(bpm, 0.5, name ? name : '8n') },
    '8nt': function(bpm, name) { return new Interval(bpm, 1 / 3, name ? name : '8nt') },
    '16n': function(bpm, name) { return new Interval(bpm, 0.25, name ? name : '16n') },
    '16nt': function(bpm, name) { return new Interval(bpm, 1 / 6, name ? name : '16nt') },
    '32n': function(bpm, name) { return new Interval(bpm, 0.125, name ? name : '32n') },
    '32nt': function(bpm, name) { return new Interval(bpm, 1 / 12, name ? name : '32nt') },
};
