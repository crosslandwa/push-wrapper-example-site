'use strict'

const EventEmitter = require('events'),
    util = require('util'),
    foreach = require('lodash.foreach');

function BPM(initial) {
    EventEmitter.call(this);
    let current = clip(initial) ? clip(initial) : 120,
        bpm = this;

    this.report = function() { bpm.emit('changed', current) }
    this.change_by = function(amount) {
        current = clip(current + amount);
        bpm.report();
    }
}
util.inherits(BPM, EventEmitter);

function clip(bpm) {
    return bpm < 20 ? 20 : (bpm > 300 ? 300 : bpm);
}

module.exports = BPM;