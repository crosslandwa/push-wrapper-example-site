'use strict'

function Mixer(numberOfChannels, audioContext) {
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

  this.toMaster = function () {
    masterGainNode.disconnect()
    masterGainNode.connect(audioContext.destination)
    return mixer
  }
}

function Channel (gainNode, audioContext) {

  this.changeGainTo = function (newGain) {
    gainNode.gain.linearRampToValueAtTime(newGain.toAbsolute(), audioContext.currentTime + 0.005)
  }
}

module.exports = Mixer
