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

  it ('does not quantise sequence when the metronome is not running', () => {
    let events = []
    capture(events, 'name')
    sequencer.recordButtonPressed()
    sequencer.addEvent('name', 'one')

    setTimeout(() => { sequencer.addEvent('name', 'two') }, 63)
    setTimeout(() => { sequencer.recordButtonPressed() }, 100)
    setTimeout(() => {
      expectEventAtTime(events[0], 'name', 100, 'one')
      expectEventAtTime(events[1], 'name', 163, 'two')
      expectEventAtTime(events[2], 'name', 200, 'one')
    }, 1000)
  })
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