'use strict'
const SwitchableObserver = require('../src/SwitchableObserver.js')
const BPM = require('wac.scheduling')().BPM


describe('SwitchableObserver', () => {

  it('can observe an observable', () => {
    let output = ''
    let bpm = BPM(120)
    let observer = new SwitchableObserver(x => { output = x })
    observer.addListener(bpm, 'changed', bpm => bpm.current())
    observer.listenTo(bpm)
    expect(output).toEqual('')

    bpm.changeTo(100)
    expect(output).toEqual(100)
  })

  it('shows the state of the observerable if it has a report function', () => {
    let output = ''
    let bpm = BPM(120)
    let observer = new SwitchableObserver(x => { output = x })
    observer.addListener(bpm, 'changed', bpm => bpm.current(), bpm.report)
    observer.listenTo(bpm)

    expect(output).toEqual(120)
  })

  it('shows the state of the most recently listened to observerable', () => {
    let output = ''
    let bpm = BPM(120)
    let bpm2 = BPM(130)

    let observer = new SwitchableObserver(x => { output = x })
    observer.addListener(bpm, 'changed', bpm => bpm.current(), bpm.report)
    observer.addListener(bpm2, 'changed', bpm => bpm.current(), bpm2.report)

    observer.listenTo(bpm)
    expect(output).toEqual(120)

    bpm.changeTo(125)
    expect(output).toEqual(125)

    observer.listenTo(bpm2)
    expect(output).toEqual(130)

    bpm.changeTo(150)
    expect(output).toEqual(130)

    bpm2.changeTo(140)
    expect(output).toEqual(140)

    observer.listenTo(bpm)
    bpm2.changeTo(100)
    expect(output).toEqual(150)
  })
})
