'use strict'

const EventEmitter = require('events')
const util = require('util')
const { compose, min, max, sum } = require('ramda')

const defaultTo120 = (amount) => amount ? amount : 120
const rounded2dp = (amount) => Math.round(amount * 100) / 100
const clippedBetween20And300 = compose(min(300), max(20))
const sanitize = compose(rounded2dp, clippedBetween20And300, defaultTo120)

function BPM(initial) {
    EventEmitter.call(this)
    let bpm = this
    let current = sanitize(initial)

    let updateAndReport = function(newBpm) {
        current = sanitize(newBpm)
        bpm.report()
    }

    this.current = () => current
    this.report = () => bpm.emit('changed', bpm)
    this.change_by = (amount) => updateAndReport(sum([current, amount]))
    this.change_to = (amount) => updateAndReport(amount)
}
util.inherits(BPM, EventEmitter)

module.exports = BPM
