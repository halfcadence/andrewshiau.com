import { defineConfig } from '@playwright/test';

// E2E for /practice-room/. The server is `astro preview` on LOOPBACK ONLY — never
// 0.0.0.0 on this machine (see CLAUDE.md rule 1) — started by Playwright and torn
// down with the run.
//
// The fake microphone is per-PROJECT: --use-file-for-fake-audio-capture is a
// browser launch flag, so each input frequency needs its own browser instance.
// Tests select their input by project name.
const mkProject = (name: string, wavFile: string | null, testMatch: string | RegExp) => ({
  name,
  testMatch,
  use: {
    launchOptions: {
      args: [
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream', // auto-grant the mic permission prompt
        '--autoplay-policy=no-user-gesture-required',
        ...(wavFile
          ? [`--use-file-for-fake-audio-capture=${new URL(`./tests/e2e/fixtures/${wavFile}`, import.meta.url).pathname}`]
          : []),
      ],
    },
  },
});

// The preview port is an env var so two sessions (or a red arm and a green arm) can run
// the suite at once instead of one silently reusing the other's server — which would make
// a build under test read as green off a bundle it never produced.
const PORT = process.env.E2E_PORT || '4321';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 45_000,
  retries: 1,
  // The audio clock and the scheduler are timing-sensitive; parallel workers on a
  // shared devbox add jitter the assertions would have to absorb.
  workers: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL || `http://127.0.0.1:${PORT}`,
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined // testing against a deployed URL (the live-verify pass)
    : {
        command: `npm run preview -- --port ${PORT}`,
        url: `http://127.0.0.1:${PORT}`,
        reuseExistingServer: false,
        timeout: 30_000,
      },
  projects: [
    mkProject('tuner-440', 'sine-440.wav', /tuner-440\.spec\.ts/),
    // The bleed test needs a PULSED input, not a steady one: a continuous tone masks the
    // click, so the bug cannot appear (a steady-sine version of this test passed against
    // the unfixed page). The rests are where the metronome gets read as a note.
    mkProject('bleed', 'pulse-440.wav', /bleed\.spec\.ts/),
    mkProject('tuner-446', 'sine-446.wav', /tuner-446\.spec\.ts/),
    mkProject('tuner-196', 'sine-196.wav', /tuner-196\.spec\.ts/),
    // /pitchgraph/ needs a PHRASE, not a tone: its subject is what happens between notes
    // and what each finished note reports, neither of which a single sustained sine can
    // exercise. Four notes at four known offsets, with rests, so the panels have four
    // different truths to check.
    mkProject('pitchgraph', 'phrase-4.wav', /pitchgraph\.spec\.ts/),
    // THE SLUR, in its own project because the fake mic is a launch flag. This is the
    // fixture that can tell a working segmenter from a broken one: `phrase-4.wav` rests
    // between every note, which is precisely where even `attack-lock` is correct — swapping
    // the page to it passed the entire suite. No rest, no reset, and the wrong mechanism
    // measures B4 against A4 and pins off scale.
    mkProject('pitchgraph-slur', 'slur-a4-b4.wav', /pitchgraph-slur\.spec\.ts/),
    // ROOM NOISE, its own project because the fake mic is a launch flag. This is the only
    // fixture that can fail the "no panel off its axis" invariant: it reproduces the owner's
    // office (50 Hz hum, LF rumble, a noise floor) where the detected pitch jumps between
    // reads. Clean sines cannot produce the bug at all.
    mkProject('pitchgraph-noise', 'room-noise.wav', /pitchgraph-noise\.spec\.ts/),
    // LOW TONES THAT HOP. The one fixture that reproduces the owner's off-axis panels: the
    // detector picking a different period each read while one note stays open. room-noise
    // was too smooth to do it (0 false panels from 247 reads), which the red arm proved.
    mkProject('pitchgraph-jumps', 'low-jumps.wav', /pitchgraph-jumps\.spec\.ts/),
    // THE ARPEGGIATED VOICING, its own project because the fake mic is a launch flag. This is
    // the only fixture that can exercise the chord dealer's grading: four plucked notes of a
    // Dm7 in the dealer's own register, held 700ms each with a rest between, so the 60ms read
    // loop sees each one and no note's decay is charged to the next. Verified through the
    // shipped detector before the test was written — D3 F3 A3 C4, 72 reads each, no spurious
    // notes — because a fixture nobody checked makes a test that cannot fail.
    mkProject('changes-arp', 'arp-dm7.wav', /changes-arp\.spec\.ts/),
    mkProject('metronome', null, /metronome\.spec\.ts|tone\.spec\.ts|page\.spec\.ts|swipe\.spec\.ts|accent\.spec\.ts|scrub\.spec\.ts|smooth\.spec\.ts|changes\.spec\.ts|loop\.spec\.ts|room\.spec\.ts/),
  ],
});
