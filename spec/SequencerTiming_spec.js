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
    sequencer = new Sequencer(1, Scheduling, bpm, metronome)
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

  it ('quantises sequence when the metronome is running', (done) => {
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

  // quantised sequence timing changes with BPM 
  // unquantised sequence timing unaffected by BPM change
  // unquantised sequence can become quantised by setting its length in beats (?)
  // starts quantised sequence in sync with metronome
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