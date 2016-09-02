# push-wrapper demo site

A relatively simple web application that uses the Ableton Push hardware as a MIDI controller for a drum machine, via the [push-wrapper npm module](https://www.npmjs.com/package/push-wrapper).

## Running locally

**Installation**

    cd push-wrapper-example-site
    sudo npm install -g browserify
    npm install # installs dependencies
    npm run-script build # bundles app.js and all its dependencies into single file bundle.js, which is included in index.html

**Start web server**

The Push hardware uses MIDI SYSEX messages for some of it communication. MIDI SYSEX is only supported in the browser if the page is served securely (i.e. over HTTPS).

Under OS X, Python can be used to create a simple HTTPS server - this repo includes a script to start that server, and also prompts you to create a *self-signed certificate* for that HTTPS server to use. Generation of this certificate is only required the first time you start the server - the generated cert is stored at `example-site/server.pem`

    python simple-https-server.py # Fill in details for certificate when prompted

**Load app in browser**

- Navigate to `https://localhost:4443` in Chrome
- Chrome will consider the *self-signed certificate* used by the server as invalid. Read the code, and if you are happy accept the invalid cert in the warning page Chrome displays
- Allow browser use of MIDI devices via the dialogue box that pops up

### Disclaimer

This example site is only **known** to work in Google Chrome/OS X...

## Credits

Initial version of the app based off blog post here: http://www.keithmcmillen.com/blog/making-music-in-the-browser-web-midi-api/

Timing for repeated notes inspired by this: https://github.com/cwilso/metronome

## TODO/Ideas

- In app sequencing
  - ~~Delete sequence~~
  - ~~Record new sequence~~
  - Swap playing sequence. Stop other sequences and 'legato' behaviour
  - Delete events in sequence
- rethink sequencing and repetae interactions
  - sequencing the repatae start/stop leads easily to stuck notes/silence
  - could repetaed notes get recorded into sequence?
  - or should event include note length (how long held down for)?
- BPM aware sequence wrapper - this done as proof of concept
  - ~~sort of works while running, need to stop/start to get all notes playing. Likely a bug with the start offset~~ Fixed!
  - ~~responds to changes in global BPM (i.e. adjusts event placement and loop length)~~
  - ~~consider using toJSON/load with manipulation event.when before loading~~
  - consider the whens as a fraction of loop length rather than absolute ms time...
    - have to calculate ms every time event scheduled, rather than once per BPM change...
    - but, serialized version decoupled from BPM (unless we store both, but only serialize the fractional amount)
- ~~BPM synced to (1st) sequence~~
  - ~~calculate (approx)/set how many beats long sequence is and adjusts global BPM automatically to match~~
  - ~~is timing good enough?~~
    - ~~yes for repeater when swapped to use atATime instead of inTheFuture~~
    - ~~need to update sequence repeat functionality to use atATime instead of inTheFuture (wac.scheduling 1.3.0)~~
- Change sequence length
  - ~~whilst stopped~~
  - whilst running. why?
- UI for
  - recording playback status
  - selected sequence
- ~~Fix timing when overdubbing notes on subsequent playback~~
- ~~remove the 'restart' action from the serialized JSON representation~~

- add tests/define behaviour around load() method of Sequence when its playing
- ~~emit stopped event when unlooped sequence finishes~~
- emit a 'restart' event?
- test toJSON/load for unlooped sequence
- addEventNow slightly undefined behaviour for stopped

### Sequence API

```javascript
const context = new window.AudioContext(),
    Scheduling = require('wac.scheduling')(context),
    Sequence = require('./src/AppSequence.js');
    
let sequence = new Sequence(Scheduling);

sequence.on(eventName, (eventData) => /* do stuff */);
sequence.on('stopped', (eventData) => /* sequence stopped actions */);

sequence.addEventAt(whenMs, eventName, eventData); // whenMs specifies how far into the sequence the given eventName/eventData will be emitted
sequence.addEventNow(eventName, eventData); // adds an event at the current point in the (playing) sequence
sequence.loop(loopLengthMs); // optional, sets a loop length and sequence will repeat until stopped
sequence.start([offsetMs]); // starts emitting events [starting from a given offset if provided]
sequence.stop(); // stops sequence, emits stopped event

sequence.reset(); // clears all events and loop length

sequence.toJSON(); // returns a JSON representation of the sequence (that can be JSON stringified for storage)
sequence.load(json); // stops the sequence (if running) and loads new events/loops specified in json

sequence.scale(scaleFactor); // makes the events in the sequence and its loop length (if looping) longer/shorter 

sequence.currentPositionMs(); // returns current position within loop in ms
sequence.loopLengthMs(); // returns the loop length in ms (or undefined if the sequence is not looped)
```

### Add event now

The addEventNow method has some slightly special behaviour

```javascript    
let sequence = new Sequence(Scheduling);

// sequence that is not running

sequence.addEventNow(name, data) // first call adds an event at time 0ms and starts the internal timer running
setTimeout(() => sequence.addEventNow(name, data), 50) // subsequent calls add event at the time called, relative to ths sequence start time (i.e. 50ms in this case)

// sequence that is running
sequence.start()
sequence.addEventNow(name, data) // adds the event at current position within the sequence

```
