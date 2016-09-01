'use strict'
const Sequencer = require('../src/Sequencer.js')
const Scheduling = require('wac.scheduling')()
const BPM = require('../src/bpm.js')

function LedButton() {
    let state = 'not yet set'
    this.off = function() { state = 'off' }
    this.ready = function() { state = 'dim' }
    this.on = function() { state = 'on' }
    this.state = function() { return state }
}

function SelectionButton(sequenceNumber) {
    let state = 'not yet set'
    this.off = function() { state = 'off' }
    this.hasSequence = function() { state = 'hasSequence' }
    this.selected = function() { state = 'selected' }
    this.playing = function() { state = 'playing' }
    this.recording = function() { state = 'recording' }
    this.state = function() { return state }
    this.number = sequenceNumber
}

describe('Sequencer', () => {
    let sequencer
    let rec = new LedButton(), play = new LedButton, del = new LedButton()
    let sel1 = new SelectionButton(1), sel2 = new SelectionButton(2), sel3 = new SelectionButton(3)

    beforeEach(() => {
        sequencer = new Sequencer(rec, play, del, [sel1, sel2, sel3], Scheduling, new BPM(120))
    })

    it('shows the selected sequence', () => {
        expect(sel1.state()).toEqual('selected')
        expect(sel2.state()).toEqual('off')
        expect(sel3.state()).toEqual('off')

        sequencer.select(2)

        expect('off').toEqual(sel1.state())
        expect('selected').toEqual(sel2.state())
        expect('off').toEqual(sel3.state())
    })

    it('shows the armed state of the selected sequence', () => {
        sequencer.select(2)

        expect('off').toEqual(play.state())
        expect('dim').toEqual(del.state())
        expect('off').toEqual(rec.state())

        sequencer.rec()

        expect('off').toEqual(play.state())
        expect('dim').toEqual(del.state())
        expect('on').toEqual(rec.state())

        sequencer.select(1)
        expect('off').toEqual(play.state())
        expect('dim').toEqual(del.state())
        expect('off').toEqual(rec.state())
    })

    it('shows the playing state of the selected sequence', (done) => {
        sequencer.select(2)

        expect('off').toEqual(play.state())
        expect('dim').toEqual(del.state())
        expect('off').toEqual(rec.state())

        sequencer.rec()
        sequencer.addEvent('event', {})

        setTimeout(sequencer.play, 100)

        setTimeout(() => {
            expect(play.state()).toEqual('on')
            expect(del.state()).toEqual('on')
            expect(rec.state()).toEqual('off')
            expect(sel1.state()).toEqual('off')
            expect(sel2.state()).toEqual('selected')
            expect(sel3.state()).toEqual('off')

            sequencer.select(1)

            expect(play.state()).toEqual('off')
            expect(del.state()).toEqual('dim')
            expect(rec.state()).toEqual('off')
            expect(sel1.state()).toEqual('selected')
            expect(sel2.state()).toEqual('playing')
            expect(sel3.state()).toEqual('off')

            done()
        }, 110)
    })

    it('emits sequenced events', (done) => {
        let emitted = []
        sequencer.on('sequence1-event', (data) => emitted.push({name: 'sequence1-event', data: data }))
        sequencer.on('sequence2-event', (data) => emitted.push({name: 'sequence2-event', data: data }))
        sequencer.on('stopped', (data) => emitted.push('stopped'))

        sequencer.rec()
        sequencer.addEvent('sequence1-event', {})
        setTimeout(sequencer.play, 100) //start 1 looping (100ms long)
        setTimeout(() => {
            sequencer.select(2)
            sequencer.rec()
            sequencer.addEvent('sequence2-event', {})
        }, 220)
        setTimeout(sequencer.play, 300) //start 2 looping (80ms long)
        setTimeout(sequencer.play, 400) //stop

        setTimeout(() => {
            console.log(emitted)
            expect(emitted.length).toEqual(5)
            expect(emitted[0]).toEqual({name: 'sequence1-event', data: {} })
            expect(emitted[1]).toEqual({name: 'sequence1-event', data: {} })
            expect(emitted[2]).toEqual({name: 'sequence2-event', data: {} })
            expect(emitted[3]).toEqual({name: 'sequence2-event', data: {} })
            expect(emitted[4]).toEqual('stopped')

            done()
        }, 410)
    })

})
