'use strict'

function SwitchableObserver(cb) {
  let observables = []
  let actions = []
  let observed = undefined

  this.addListener = function (emitter, event, on, report) {
    if (observables.indexOf(emitter) !== -1) return // already added
    observables.push(emitter)
    actions.push({ report: report, listener: x => { cb(on(x)) }, event: event })
  }

  this.listenTo = function (emitter) {
    removePreviousListener()
    let index = observables.indexOf(emitter)
    if (index === -1) return
    observed = emitter
    let o = actions[index]
    observed.on(o.event, o.listener)
    if (o.report) { o.report() }
  }

  function removePreviousListener() {
    if (!observed) return
    let o = actions[observables.indexOf(observed)]
    observed.removeListener(o.event, o.listener)
    observed = undefined
  }
}

module.exports = SwitchableObserver
