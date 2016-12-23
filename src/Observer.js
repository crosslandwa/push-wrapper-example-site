'use strict'

function nowt () {}

function Observable (emitter, event, callback, report = nowt) {
  return {emitter: emitter, event: event, callback: callback, report: report}
}

function enable (observable) {
  observable.emitter.on(observable.event, observable.callback)
}

function reportOn (observable) {
  observable.report()
}

function disable (observable) {
  observable.emitter.removeListener(observable.event, observable.callback)
}

module.exports = {
  create: Observable,
  disable: disable,
  enable: enable,
  reportOn: reportOn,
}
