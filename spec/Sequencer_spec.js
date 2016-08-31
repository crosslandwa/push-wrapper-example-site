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

function SelectionButton() {
    let state = 'not yet set'
    this.off = function() { state = 'off' }
    this.hasSequence = function() { state = 'hasSequence' }
    this.current = function() { state = 'selected' }
    this.state = function() { return state }
}

describe('Sequencer', () => {
    let sequencer
    let rec = new LedButton(), play = new LedButton, del = new LedButton()
    let sel1 = new SelectionButton(), sel2 = new SelectionButton(), sel3 = new SelectionButton()

    beforeEach(() => {
        sequencer = new Sequencer(rec, play, del, [sel1, sel2, sel3], Scheduling, new BPM(120))
    })

    it('shows the selected sequence', () => {
        expect('selected').toEqual(sel1.state())
        expect('off').toEqual(sel2.state())
        expect('off').toEqual(sel3.state())

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

    fit('shows the played state of the selected sequence', (done) => {
        sequencer.select(2)

        expect('off').toEqual(play.state())
        expect('dim').toEqual(del.state())
        expect('off').toEqual(rec.state())

        sequencer.rec()
        sequencer.addEvent('event', {})

        setTimeout(sequencer.play, 100)

        setTimeout(() => {
            expect('on').toEqual(play.state())
            expect('on').toEqual(del.state())
            expect('off').toEqual(rec.state())
            expect('off').toEqual(sel1.state())
            expect('selected').toEqual(sel2.state())
            expect('off').toEqual(sel3.state())

            sequencer.select(1)

            expect('off').toEqual(play.state())
            expect('dim').toEqual(del.state())
            expect('off').toEqual(rec.state())
            expect('selected').toEqual(sel1.state())
            expect('hasSequence').toEqual(sel2.state())
            expect('off').toEqual(sel3.state())

            done()
        }, 110)
    })

})
