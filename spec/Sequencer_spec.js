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
    this.hasSequence = function() { state = 'yellow' }
    this.selected = function() { state = 'orange' }
    this.playing = function() { state = 'green' }
    this.recording = function() { state = 'red' }
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

    it('initialises with sequence 1 selected but not armed', () => {
        expect(sel1.state()).toEqual('orange')
        expect(sel2.state()).toEqual('off')
        expect(sel3.state()).toEqual('off')

        expect('off').toEqual(play.state())
        expect('dim').toEqual(del.state())
        expect('off').toEqual(rec.state())
    })

    it('automatically arms the selected sequence if it has no recorded events', () => {
        sequencer.select(2)

        expect('off').toEqual(sel1.state())
        expect('red').toEqual(sel2.state())
        expect('off').toEqual(sel3.state())

        expect('off').toEqual(play.state())
        expect('dim').toEqual(del.state())
        expect('on').toEqual(rec.state())
    })

    it('allows an armed sequence to be disarmed', () => {
        sequencer.select(2) // selected but armed
        sequencer.rec() // disarm

        expect('off').toEqual(play.state())
        expect('dim').toEqual(del.state())
        expect('off').toEqual(rec.state())

        expect('off').toEqual(sel1.state())
        expect('orange').toEqual(sel2.state())
        expect('off').toEqual(sel3.state())
    })

    it('shows the selected sequence to be playing when events recorded and play pressed', (done) => {
        sequencer.select(2)
        sequencer.addEvent('event', {})

        setTimeout(sequencer.play, 100)

        setTimeout(() => {
            expect('on').toEqual(play.state())
            expect('on').toEqual(del.state())
            expect('off').toEqual(rec.state())
            expect('off').toEqual(sel1.state())
            expect('green').toEqual(sel2.state())
            expect('off').toEqual(sel3.state())

            sequencer.select(1)

            expect('off').toEqual(play.state())
            expect('dim').toEqual(del.state())
            expect('on').toEqual(rec.state())
            expect('red').toEqual(sel1.state())
            expect('green').toEqual(sel2.state())
            expect('off').toEqual(sel3.state())

            done()
        }, 110)
    })

    it('allows only one sequence to be active and emits its sequenced events', (done) => {
        let emitted = []
        sequencer.on('sequence1-event', (data) => emitted.push({name: 'sequence1-event', data: data }))
        sequencer.on('sequence2-event', (data) => emitted.push({name: 'sequence2-event', data: data }))
        sequencer.on('stopped', (data) => emitted.push('stopped'))

        sequencer.rec() // arm
        sequencer.addEvent('sequence1-event', {})
        setTimeout(sequencer.play, 100) //start 1 looping (100ms long)
        setTimeout(() => {
            sequencer.select(2) // automatically armed
            sequencer.addEvent('sequence2-event', {})
        }, 220)
        setTimeout(sequencer.play, 300) //start 2 looping (80ms long)
        setTimeout(sequencer.play, 400) //stop

        setTimeout(() => {
            expect(5).toEqual(emitted.length)
            expect({name: 'sequence1-event', data: {} }).toEqual(emitted[0])
            expect({name: 'sequence1-event', data: {} }).toEqual(emitted[1])
            expect({name: 'sequence2-event', data: {} }).toEqual(emitted[2])
            expect({name: 'sequence2-event', data: {} }).toEqual(emitted[3])
            expect('stopped').toEqual(emitted[4])

            done()
        }, 410)
    })

})
