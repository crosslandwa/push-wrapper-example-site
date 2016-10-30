'use strict'
const Sequencer = require('../src/Sequencer.js')
const Scheduling = require('wac.scheduling')()

describe('Sequencer', () => {
  let sequencer
  let clockStartTime
  let metronome
  let bpm

  let capture = function (events, eventName) {
    sequencer.on(eventName, (data) => events.push([eventName, data, Scheduling.nowMs() - clockStartTime]))
  }

  beforeEach(() => {
  	bpm = Scheduling.BPM(240) // 4 beats per second
  	metronome = Scheduling.Metronome(4, bpm)
    sequencer = new Sequencer(2, Scheduling, bpm, metronome)
    clockStartTime = Scheduling.nowMs()
  })

  it ('does not quantise sequence when the metronome is not running', (done) => {
    let events = []
    capture(events, 'name')
    sequencer.recordButtonPressed()
    sequencer.addEvent('name', 'one')

    setTimeout(() => { sequencer.addEvent('name', 'two') }, 20)
    setTimeout(() => { sequencer.recordButtonPressed() }, 100)
    setTimeout(() => {
      expectEventAtTime(events[0], 'name', 100, 'one')
      expectEventAtTime(events[1], 'name', 120, 'two')
      expectEventAtTime(events[2], 'name', 200, 'one')
      done()
    }, 300)
  })

  it ('quantises sequence if the metronome is running when recording starts', (done) => {
    let events = []
    capture(events, 'name')

    // 240 bpm, 1/4PPQ, expect events at 0, 62.5, 125, 187.5 250
    metronome.start()

    sequencer.recordButtonPressed()
    sequencer.addEvent('name', 'one')

    setTimeout(() => { sequencer.addEvent('name', 'two') }, 40) // quantises to 62.5
    setTimeout(() => { sequencer.recordButtonPressed() }, 200) // quantised to beat length, of 250
    setTimeout(() => {
      expectEventAtTime(events[0], 'name', 250, 'one')
      expectEventAtTime(events[1], 'name', 312.5, 'two')
      expectEventAtTime(events[2], 'name', 500, 'one')
      done()
    }, 550)
  })

  it ('starts a new quantised sequence on the next beat when recording finishes before the next beat', done => {
    let events = []
    capture(events, 'name')

    // 240 bpm, beat every 250ms
    metronome.start()

    sequencer.recordButtonPressed()
    sequencer.addEvent('name', 'one')

    setTimeout(() => { sequencer.recordButtonPressed() }, 200) // quantised to beat length, of 250
    setTimeout(() => {
      expectEventAtTime(events[0], 'name', 250, 'one')
      done()
    }, 300)
  })

  it ('starts a new quantised sequence on the previous beat when recording finishes slightly after last beat', done => {
    let events = []
    capture(events, 'name')

    // 240 bpm, beat every 250ms
    metronome.start()

    sequencer.recordButtonPressed()
    sequencer.addEvent('name', 'one')

    setTimeout(() => { sequencer.addEvent('name', 'two') }, 50) // quantised to beat length, of 250
    setTimeout(() => { sequencer.recordButtonPressed() }, 260) // quantised to beat length, of 250
    setTimeout(() => {
      expectEventAtTime(events[0], 'name', 300, 'two')
      done()
    }, 350)
  })

  it ('starts a previously recorded (but stopped) quantised sequence on the next metronome tick', done => {
    let events = []
    capture(events, 'name')

    // 240 bpm, beat every 250ms
    metronome.start()

    sequencer.recordButtonPressed()
    sequencer.addEvent('name', 'one')

    setTimeout(() => { sequencer.playButtonPressed() }, 200) // quantised to beat length, of 250
    setTimeout(() => { sequencer.playButtonPressed() }, 230) // stops
    setTimeout(() => { sequencer.playButtonPressed() }, 300) // starts at next tick, i.e. 500
    setTimeout(() => {
      expectEventAtTime(events[0], 'name', 500, 'one')
      done()
    }, 550)
  })

  it ('starts a previously recorded (but stopped) quantised sequence immediately if metronome not running', done => {
    let events = []
    capture(events, 'name')

    // 240 bpm, beat every 250ms
    metronome.start()

    sequencer.recordButtonPressed()
    sequencer.addEvent('name', 'one')

    setTimeout(() => { sequencer.playButtonPressed() }, 200) // quantised to beat length, of 250
    setTimeout(() => { sequencer.playButtonPressed() }, 230) // stops
    setTimeout(() => { metronome.stop() }, 270) // stops metronome
    setTimeout(() => { sequencer.playButtonPressed() }, 300) // starts at next tick, i.e. 500
    setTimeout(() => {
      expectEventAtTime(events[0], 'name', 300, 'one')
      done()
    }, 350)
  })

  it ('switches sequences at the next quantisation interval', done => {
    let events = []
    capture(events, 'name1')
    capture(events, 'name2')

    // 240 bpm, beat every 250ms
    metronome.start()

    sequencer.recordButtonPressed()
    sequencer.addEvent('name1', 'one')

    setTimeout(() => { sequencer.selectSequence(2); sequencer.addEvent('name2', 'one') }, 200) // quantised to beat length, of 250
    setTimeout(() => { sequencer.selectSequence(1) }, 300)
    setTimeout(() => { sequencer.selectSequence(2) }, 320)
    setTimeout(() => {
      expectEventAtTime(events[0], 'name1', 312.5, 'one')
      expectEventAtTime(events[1], 'name2', 375, 'one')
      done()
    }, 400)
  })

  it ('retimes quantised sequence when bpm changes', done => {
    let events = []
    capture(events, 'name')

    // 240 bpm, beat every 250ms
    metronome.start()

    sequencer.recordButtonPressed()
    sequencer.addEvent('name', 'one')

    setTimeout(() => { sequencer.playButtonPressed() }, 200) // quantised to beat length, of 250
    setTimeout(() => { bpm.changeTo(300) }, 260) // 5 beats per second, i.e. every 200
    setTimeout(() => {
      expectEventAtTime(events[0], 'name', 250, 'one')
      expectEventAtTime(events[1], 'name', 450, 'one')
      done()
    }, 500)
  })

  it ('unquantised sequence is not affected by bpm changes', done => {
    let events = []
    capture(events, 'name')

    sequencer.recordButtonPressed()
    sequencer.addEvent('name', 'one')

    setTimeout(() => { sequencer.playButtonPressed() }, 200) // quantised to beat length, of 250
    setTimeout(() => { bpm.changeTo(300) }, 260) // 5 beats per second, i.e. every 200
    setTimeout(() => {
      expectEventAtTime(events[0], 'name', 200, 'one')
      expectEventAtTime(events[1], 'name', 400, 'one')
      done()
    }, 500)
  })

  it ('restarts a sequence at the next quantisation interval when the metronome is running', done => {
    let events = []
    capture(events, 'name')

    // 240 bpm, beat every 250ms
    metronome.start()

    sequencer.recordButtonPressed()
    sequencer.addEvent('name', 'one')

    setTimeout(() => { sequencer.playButtonPressed() }, 200) // quantised to beat length, of 250
    setTimeout(() => { sequencer.selectSequence(1) }, 260) // 5 beats per second, i.e. every 200
    setTimeout(() => {
      expectEventAtTime(events[0], 'name', 250, 'one')
      expectEventAtTime(events[1], 'name', 312.5, 'one')
      done()
    }, 350)
  })

  it ('restarts an unquantiserd sequence immediately', done => {
    let events = []
    capture(events, 'name')

    sequencer.recordButtonPressed()
    sequencer.addEvent('name', 'one')

    setTimeout(() => { sequencer.playButtonPressed() }, 200) // quantised to beat length, of 250
    setTimeout(() => { sequencer.selectSequence(1) }, 260) // 5 beats per second, i.e. every 200
    setTimeout(() => {
      expectEventAtTime(events[0], 'name', 200, 'one')
      expectEventAtTime(events[1], 'name', 260, 'one')
      done()
    }, 300)
  })

  // unquantised sequence can become quantised by setting its length in beats (?)
})


function expectEventAtTime (event, expectedName, expectedTime, expectedData) {
  if (typeof event === 'undefined') return fail('expected an event but was undefined')
  let timingTolerance = 15
  expect(event[0]).toEqual(expectedName)
  if (expectedData) {
    expect(event[1]).toEqual(expectedData)
  }

  let actualTime = event[2]

  if ((actualTime >= (expectedTime - 1)) && (actualTime < expectedTime + timingTolerance)) {
    expect(actualTime).toBeLessThan(expectedTime + timingTolerance)
  } else {
    expect(`${actualTime}ms`).toEqual(`${expectedTime}ms`) // this will always fail, but gives a helpful error message
  }
}