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
  - ~~Delete sequence/events in sequence~~
  - Record new sequence
  - Swap playing sequence
- BPM aware sequence wrapper
  - responds to changes in global BPM (i.e. adjusts event placement and loop length)
  - consider using toJSON/load with manipulation event.when before loading
  - consider the whens as a fraction of loop length rather than absolute ms time...
    - have to calculate ms every time event scheduled, rather than once per BPM change...
    - but, serialized version decoupled from BPM
- ~~BPM synced to (1st) sequence~~
  - ~~calculate (approx)/set how many beats long sequence is and adjusts global BPM automatically to match~~
  - is timing good enough?
- Change sequence length
  - ~~whilst stopped~~
  - whilst running
    - do we need segmented sequencing for this?
  - Consider immutable sequence
    - length cannot be changed, instead create new sequence
    - consider how to handle event listeners
- UI for recording playback status
- ~~Look at bug for held/sequenced notes and repetae~~
  - ~~should ++ and -- as a result of being sequenced...~~
- ~~Sequence through repetae module, not direct to player~~
  - notes recorded via qwerty are not repetaed. Fix this?
- ~~Fix timing when overdubbing notes on subsequent playback~~
