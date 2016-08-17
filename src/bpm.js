'use strict'

const EventEmitter = require('events'),
    util = require('util'),
    foreach = require('lodash.foreach');

function BPM(initial) {
    EventEmitter.call(this);
    let bpm = this;

    this.current = clip(initial) ? clip(initial) : 120;

    this.report = function() { bpm.emit('changed', bpm) }
    this.change_by = function(amount) {
        bpm.current = clip(bpm.current + amount);
        bpm.report();
    }
    this.change_to = function(newBPM) {
        bpm.current = clip(newBPM);
        console.log(newBPM);
        console.log(bpm);
        bpm.report();
    }
}
util.inherits(BPM, EventEmitter);

function clip(bpm) {
    return bpm < 20 ? 20 : (bpm > 300 ? 300 : bpm);
}

module.exports = BPM;