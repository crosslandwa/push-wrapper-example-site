'use strict'
const Sequencer = require('../src/Sequencer.js')
const Scheduling = require('wac.scheduling')()

function LedButton() {
    let state = 'off'
    this.off = function() { state = 'off' }
    this.ready = function() { state = 'dim' }
    this.on = function() { state = 'on' }
    this.state = function() { return state }
}

function SelectionButton(sequenceNumber) {
    let state = 'off'
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
    let rec = new LedButton(), play = new LedButton
    let sel1 = new SelectionButton(1), sel2 = new SelectionButton(2), sel3 = new SelectionButton(3)
    let selectors = [sel1, sel2, sel3]

    beforeEach(() => {
        selectors.forEach(selector => {selector.off()})
        sequencer = new Sequencer(3, Scheduling, Scheduling.BPM(120), Scheduling.Metronome(4, 120))
        sequencer.on('sequenceState', (number, state, isSelected) => {
            switch (state) {
                case 'idle':
                    isSelected ? selectors[number - 1].selected() : selectors[number - 1].off()
                    rec.off(); play.off(); break;
                case 'armed':
                    selectors[number - 1].recording()
                    rec.on(); play.off(); break;
                case 'recording':
                    selectors[number - 1].recording()
                    rec.on(); play.off(); break;
                case 'overdubbing':
                    selectors[number - 1].recording()
                    rec.ready(); play.on(); break;
                case 'playback':
                    selectors[number - 1].playing()
                    rec.off(); play.on(); break;
                case 'stopped':
                    isSelected ? selectors[number - 1].selected() : selectors[number - 1].hasSequence()
                    rec.off(); play.ready(); break;
            }
        })
        sequencer.reportSelectedSequenceState()
    })

    it('initialises with sequence 1 selected but not armed', () => {
        expect(sel1.state()).toEqual('orange')
        expect(sel2.state()).toEqual('off')
        expect(sel3.state()).toEqual('off')

        expect(play.state()).toEqual('off')
        expect(rec.state()).toEqual('off')
    })

    it('automatically arms the selected sequence if it has no recorded events', () => {
        sequencer.selectSequence(2)

        expect(sel1.state()).toEqual('off')
        expect(sel2.state()).toEqual('red')
        expect(sel3.state()).toEqual('off')

        expect(play.state()).toEqual('off')
        expect(rec.state()).toEqual('on')
    })

    it('allows an armed sequence to be disarmed', () => {
        sequencer.selectSequence(2) // selected but armed
        sequencer.recordButtonPressed() // disarm

        expect(sel1.state()).toEqual('off')
        expect(sel2.state()).toEqual('orange')
        expect(sel3.state()).toEqual('off')

        expect(play.state()).toEqual('off')
        expect(rec.state()).toEqual('off')
    })

    it('shows the selected sequence to be playing when events recorded and play pressed', (done) => {
        sequencer.selectSequence(2)
        sequencer.addEvent('event', {})

        setTimeout(sequencer.playButtonPressed, 100)

        setTimeout(() => {
            expect(play.state()).toEqual('on')
            expect(rec.state()).toEqual('off')
            expect(sel1.state()).toEqual('off')
            expect(sel2.state()).toEqual('green')
            expect(sel3.state()).toEqual('off')

            sequencer.selectSequence(1)

            expect(play.state()).toEqual('off')
            expect(rec.state()).toEqual('on')
            expect(sel1.state()).toEqual('red')
            expect(sel2.state()).toEqual('green')
            expect(sel3.state()).toEqual('off')

            done()
        }, 110)
    })

    it('allows only one sequence to be active and emits its sequenced events', (done) => {
        let emitted = []
        sequencer.on('sequence1-event', (data) => emitted.push({name: 'sequence1-event', data: data }))
        sequencer.on('sequence2-event', (data) => emitted.push({name: 'sequence2-event', data: data }))
        sequencer.on('stopped', (data) => emitted.push('stopped'))

        sequencer.recordButtonPressed() // arm
        sequencer.addEvent('sequence1-event', {})
        setTimeout(sequencer.playButtonPressed, 100) //start 1 looping (100ms long)
        setTimeout(() => {
            sequencer.selectSequence(2) // automatically armed
            sequencer.addEvent('sequence2-event', {})
        }, 220)
        setTimeout(sequencer.playButtonPressed, 300) //start 2 looping (80ms long)
        setTimeout(sequencer.playButtonPressed, 400) //stop

        setTimeout(() => {
            expect(emitted.length).toEqual(5)
            expect(emitted[0]).toEqual({name: 'sequence1-event', data: {} })
            expect(emitted[1]).toEqual({name: 'sequence1-event', data: {} })
            expect(emitted[2]).toEqual({name: 'sequence2-event', data: {} })
            expect(emitted[3]).toEqual({name: 'sequence2-event', data: {} })
            expect(emitted[4]).toEqual('stopped')

            done()
        }, 410)
    })

    it('automatically plays the selected sequence if it has recorded events', (done) => {
        sequencer.recordButtonPressed() // arm
        sequencer.addEvent('sequence1-event', {})
        setTimeout(sequencer.playButtonPressed, 100) //start 1 looping (100ms long)
        setTimeout(() => {
            sequencer.selectSequence(2) // automatically armed
            sequencer.addEvent('sequence2-event', {})
        }, 220)
        setTimeout(sequencer.playButtonPressed, 300) //start 2 looping (80ms long)
        setTimeout(() => {
            sequencer.selectSequence(3) // arms 3, leaves 2 playing
            sequencer.selectSequence(1) // automatically plays 1, stops 2
        }, 400)

        setTimeout(() => {
            expect(sel1.state()).toEqual('green')
            expect(sel2.state()).toEqual('yellow')
            expect(sel3.state()).toEqual('off')

            done()
        }, 410)
    })

    it('starts playback when re-selecting a recording loop', (done) => {
        sequencer.selectSequence(2)
        sequencer.addEvent('sequence2-event', {})
        setTimeout(() => sequencer.selectSequence(2), 100) //start 2 looping (100ms long)

        setTimeout(() => {
            expect(sel1.state()).toEqual('off')
            expect(sel2.state()).toEqual('green')
            expect(sel3.state()).toEqual('off')

            done()
        }, 110)
    })

    it('arms when re-selecting a loop that has just been deleted', () => {
        sequencer.selectSequence(1)
        sequencer.addEvent('sequence2-event', {})
        sequencer.deleteSequence(1)

        expect(sel1.state()).toEqual('orange')
        expect(sel2.state()).toEqual('off')
        expect(sel3.state()).toEqual('off')

        sequencer.selectSequence(1)

        expect(sel1.state()).toEqual('red')
        expect(sel2.state()).toEqual('off')
        expect(sel3.state()).toEqual('off')
    })

    it('restarts sequence when a playing loop is reselected', (done) => {
        let emitted = []
        sequencer.on('sequence1-event', (data) => emitted.push({name: 'sequence1-event', data: data }))

        sequencer.selectSequence(1) // arm
        sequencer.addEvent('sequence1-event', {})
        setTimeout(sequencer.playButtonPressed, 100) // start 1 looping (100ms long), expect events at 100, 200
        setTimeout(() => sequencer.selectSequence(1), 150) // restart 1

        setTimeout(() => {
            expect(emitted.length).toEqual(2)
            expect(emitted[0]).toEqual({name: 'sequence1-event', data: {} })
            expect(emitted[1]).toEqual({name: 'sequence1-event', data: {} })

            done()
        }, 160)
    })

    it('reverts to playback when an overdubbing sequence is reselected', (done) => {
        sequencer.selectSequence(1) // arm
        sequencer.addEvent('sequence1-event', {}) // recording
        setTimeout(sequencer.recordButtonPressed, 100) // start 1 looping and overdubbing
        setTimeout(() => sequencer.selectSequence(1), 150) // change from overdubbing to playback

        setTimeout(() => {
            expect(sel1.state()).toEqual('green')
            expect(sel2.state()).toEqual('off')
            expect(sel3.state()).toEqual('off')

            done()
        }, 160)
    })

    it('does not start playback when stopped and the currently selected sequence has events, and an empty sequence is selected', () => {
        sequencer.selectSequence(1) // arm
        sequencer.addEvent('sequence1-event', {}) // recording
        sequencer.playButtonPressed() // play
        sequencer.playButtonPressed() // stop

        expect(sel1.state()).toEqual('orange')
        expect(sel2.state()).toEqual('off')
        expect(sel3.state()).toEqual('off')

        sequencer.selectSequence(2)

        expect(sel1.state()).toEqual('yellow')
        expect(sel2.state()).toEqual('red')
        expect(sel3.state()).toEqual('off')
    })
})
