'use strict'
const EventEmitter = require('events')
const util = require('util')
const midiVelocityToAbsolute = require('./midiVelocityToAbsoluteGain.js')

function Mixer(numberOfChannels, audioContext) {
  EventEmitter.call(this)
  let mixer = this
  let masterGainNode = audioContext.createGain()

  let outputGainNodes = new Array(numberOfChannels).fill(0).map(x => audioContext.createGain())
  outputGainNodes.forEach(node => node.connect(masterGainNode))

  this.connectInput = function (source, channel) {
    source.connect(outputGainNodes[channel])
  }

  this.channel = function (number) {
    return new Channel(outputGainNodes[number], audioContext)
  }

  this.changeMasterMidiGainTo = function(value) {
    mixer.changeMasterGainTo(midiGain(value))
  }

  this.changeMasterGainTo = function(newGain) {
    masterGainNode.gain.linearRampToValueAtTime(newGain.toAbsolute(), audioContext.currentTime + 0.005)
    mixer.emit('masterGain', newGain)
  }

  this.toMaster = function () {
    masterGainNode.disconnect()
    masterGainNode.connect(audioContext.destination)
    return mixer
  }
}
util.inherits(Mixer, EventEmitter)

function Channel (gainNode, audioContext) {
  let channel = this

  this.changeMidiGainTo = function(value) {
    channel.changeGainTo(midiGain(value))
  }

  this.changeGainTo = function (newGain) {
    gainNode.gain.linearRampToValueAtTime(newGain.toAbsolute(), audioContext.currentTime + 0.005)
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
