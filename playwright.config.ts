import { defineConfig } from '@playwright/test';

// E2E for /metrotuner/. The server is `astro preview` on LOOPBACK ONLY — never
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

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 45_000,
  retries: 1,
  // The audio clock and the scheduler are timing-sensitive; parallel workers on a
  // shared devbox add jitter the assertions would have to absorb.
  workers: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:4321',
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined // testing against a deployed URL (the live-verify pass)
    : {
        command: 'npm run preview',
        url: 'http://127.0.0.1:4321',
        reuseExistingServer: false,
        timeout: 30_000,
      },
  projects: [
    mkProject('tuner-440', 'sine-440.wav', /tuner-440\.spec\.ts/),
    mkProject('tuner-446', 'sine-446.wav', /tuner-446\.spec\.ts/),
    mkProject('tuner-196', 'sine-196.wav', /tuner-196\.spec\.ts/),
    mkProject('metronome', null, /metronome\.spec\.ts|tone\.spec\.ts|page\.spec\.ts|swipe\.spec\.ts/),
  ],
});
