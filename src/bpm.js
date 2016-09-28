'use strict'

const EventEmitter = require('events')
const util = require('util')
const { compose, min, max, sum } = require('ramda')

const defaultTo120 = (amount) => amount ? amount : 120
const rounded2dp = (amount) => Math.round(amount * 100) / 100
const clippedBetween20And300 = compose(min(300), max(20))
const sanitize = compose(rounded2dp, clippedBetween20And300, defaultTo120)

const bpmToBeatLengthMs = (bpm) => (60 / bpm) * 1000
const beatLengthMsToBpm = bpmToBeatLengthMs

const toMs = (candidate) => (candidate && (typeof candidate.toMs === 'function')) ? candidate.toMs() : candidate


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
    this.beatLength = () => {
        return { toMs: () => { return bpmToBeatLengthMs(current) } }
    }
}
util.inherits(BPM, EventEmitter)

BPM.fromBeatLength = (beatLength) => new BPM(beatLengthMsToBpm(toMs(beatLength)))

module.exports = BPM
