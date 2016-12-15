'use strict'
const EventEmitter = require('events')
const util = require('util')
const midiVelocityToAbsolute = require('./midiVelocityToAbsoluteGain.js')

function Mixer(numberOfChannels, audioContext) {
  EventEmitter.call(this)
  let mixer = this
  let masterGainNode = audioContext.createGain()
  let masterChannel = new Channel(masterGainNode, audioContext, report('masterGain'))
  let outputGainNodes = new Array(numberOfChannels).fill(0).map(x => audioContext.createGain())
  outputGainNodes.forEach(node => node.connect(masterGainNode))
  let channels = outputGainNodes.map((node, i) => new Channel(node, audioContext, report('channel' + i + 'Gain')))

  this.connectInput = function (source, channel) {
    source.connect(outputGainNodes[channel])
  }

  this.channel = function (number) {
    return channels[number]
  }

  this.masterChannel = () => masterChannel

  this.toMaster = function () {
    masterGainNode.disconnect()
    masterGainNode.connect(audioContext.destination)
    return mixer
  }

  function report(channel) {
    return (gain) => mixer.emit(channel, gain)
  }
}
util.inherits(Mixer, EventEmitter)

function Channel (gainNode, audioContext, report) {
  let channel = this
  let gain = midiGain(108)

  this.changeMidiGainTo = function(value) {
    gain = midiGain(value)
    channel.changeGainTo(gain)
  }

  this.changeMidiGainBy = function(delta) {
    gain = midiGain(gain.midiValue() + delta)
    channel.changeGainTo(gain)
  }

  this.changeGainTo = function (newGain) {
    gainNode.gain.linearRampToValueAtTime(newGain.toAbsolute(), audioContext.currentTime + 0.005)
    report(newGain)
  }
}

function clampBetween0And127(value) {
  return Math.max(0, Math.min(127, value))
}

function midiGain(value) {
  return {
    midiValue: () => clampBetween0And127(value),
    toAbsolute: () => midiVelocityToAbsolute(clampBetween0And127(value)),
    toDb: () => 20 * Math.log10(midiVelocityToAbsolute(clampBetween0And127(value)))
  }
}

module.exports = Mixer
