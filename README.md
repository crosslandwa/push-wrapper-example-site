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

- pursue quantisation? The the nearest 96th (96PPQ) seems sensible, but this makes the decision the "app" is tied in to bpm
  - need selectable quantisation?
  - need to avoid sequence multiple instances of same note (event) at same time
- consolidate bpm code, in particular the rounding that occurs (make this 1 or 2 dp)
- Select button to arm a sequence I've just deleted (when re-selecting)
- Don't start playback when stopped and selecting a new sequence IF current selection has sequence
- In app sequencing
  - Delete events in sequence
- rethink bpm locking to 1st/subsequent sequences and changing number of beats sequence represents
- rethink sequencing and repetae interactions
  - sequencing the repatae start/stop leads easily to stuck notes/silence
  - could repetaed notes get recorded into sequence?
  - or should event include note length (how long held down for)?
- UI for recording + playback status

