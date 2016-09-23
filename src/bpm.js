'use strict'

const EventEmitter = require('events'),
    util = require('util');

function BPM(initial) {
    EventEmitter.call(this);
    let bpm = this;

    this.current = clip(initial ? initial : 120);

    this.report = function() { bpm.emit('changed', bpm) }
    this.change_by = function(amount) {
        bpm.current = twoDP(clip(bpm.current + amount));
        bpm.report();
    }
    this.change_to = function(newBPM) {
        bpm.current = twoDP(clip(newBPM));
        bpm.report();
    }
}
util.inherits(BPM, EventEmitter);

function clip(bpm) {
    return bpm < 20 ? 20 : (bpm > 300 ? 300 : bpm);
}

function twoDP(amount) {
    return Math.round(amount * 100) / 100
}

module.exports = BPM;
