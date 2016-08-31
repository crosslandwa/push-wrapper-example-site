'use strict'
const Sequencer = require('../src/Sequencer.js'),
    Scheduling = require('wac.scheduling')();

function LedButton() {
    let state = 'not yet set'
    this.off = function() { state = 'off' }
    this.ready = function() { state = 'ready' }
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

fdescribe('Sequencer', () => {
    let sequencer
    let rec = new LedButton(), play = new LedButton, del = new LedButton()
    let sel1 = new SelectionButton(), sel2 = new SelectionButton(), sel3 = new SelectionButton()

    beforeEach(() => {
        sequencer = new Sequencer(rec, play, del, [sel1, sel2, sel3], Scheduling)
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

})
