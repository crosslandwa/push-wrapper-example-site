'use strict'

function noReport() {}

function SwitchableObserver(cb) {
  let observables = []
  let actions = []
  let observed = undefined

  function passThrough(x) { cb(x) }

  this.addListener = function (emitter, opts) {
    if (observables.indexOf(emitter) !== -1) return // already added
    observables.push(emitter)
    actions.push({
      report: opts.report ? opts.report : noReport,
      listener: opts.on ? x => { cb(opts.on(x)) } : passThrough,
      event: opts.event
    })
  }

  this.listenTo = function (emitter) {
    removePreviousListener()
    let index = observables.indexOf(emitter)
    if (index === -1) return
    observed = emitter
    let o = actions[index]
    observed.on(o.event, o.listener)
    o.report()
  }

  function removePreviousListener() {
    if (!observed) return
    let o = actions[observables.indexOf(observed)]
    observed.removeListener(o.event, o.listener)
    observed = undefined
  }
}

module.exports = SwitchableObserver
