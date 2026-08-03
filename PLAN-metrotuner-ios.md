# Metrotuner → App Store: the plan

Ship the existing web tuner/metronome (andrewshiau.com/metrotuner) as an iPhone app.
One engineer, one Mac, first iOS ship. **Everything below runs on the Mac** — the devbox
has no Xcode and never will. The devbox's only job here is holding this document and the
web source until it's mirrored into a repo the Mac can build from.

Recommendation up front: **Capacitor wrapper, plus one small native Swift plugin for the
metronome click engine.** The web code ships as-is for the tuner and all UI; the click
scheduling moves native because that's the only way the metronome keeps clicking with the
screen locked, and background clicking is the whole reason to build an app instead of
keeping the web page. Reasoning in section 1.

---

## 1. Packaging decision

### The audio facts that decide this

Before comparing frameworks, the four facts that constrain every option:

1. **Mic in a webview works.** WKWebView supports `navigator.mediaDevices.getUserMedia`
   since iOS 14.3 (verified against webkit.org). Capacitor 8 targets iOS 15+, so every
   supported device has it. The existing MPM tuner runs unmodified in the
   webview, in the foreground.
2. **Foreground metronome timing in a webview is fine.** The lookahead scheduler already
   schedules clicks on `AudioContext.currentTime`, which is sample-accurate once
   scheduled. Output latency in WKWebView is a *constant* offset (tens of ms), and a
   constant offset is inaudible for a metronome — you hear jitter, not delay. The web
   scheduler does not need a rewrite for foreground use.
3. **Background is where the webview dies, and background is the point.** When the app is
   backgrounded or the screen locks, iOS suspends the WKWebView content process: JS
   timers freeze and the AudioContext is interrupted. The lookahead scheduler's `setTimeout`
   pump stops, so clicks stop within one lookahead window (~100ms of buffered clicks, then
   silence). Adding the `audio` background mode to the app does not reliably keep webview
   JS executing (exact behavior varies by iOS version — unverified in detail, but the
   direction is not in dispute). A practicing musician locks the phone and puts it on the
   music stand. The web page cannot serve that user; a native audio engine can, trivially.
   **This one feature is the strongest argument for shipping an app at all**, so any plan
   that leaves the metronome in the webview ships an app that isn't better than the URL.
4. **Mic + playback simultaneously needs `AVAudioSession` category `.playAndRecord`.**
   In a webview, WebKit manages the audio session itself: when `getUserMedia` starts, the
   session flips to play-and-record and output can drop in volume or route to the earpiece.
   From JS you have no control over this. Natively you set
   `.playAndRecord` with `.defaultToSpeaker`, and `.measurement` mode to switch off
   voice-processing (echo cancellation, noise suppression) that otherwise chews on
   sustained instrument tones. Whether WKWebView honors `echoCancellation: false` as a
   getUserMedia constraint is version-dependent (unverified) — natively it's just a mode.

So: tuner = webview is adequate (nobody tunes with the screen off). Metronome = must be
native to justify the app's existence. That asymmetry drives the recommendation.

### Option A — Capacitor 8 wrapping the existing page

- **Carries over:** effectively everything. The TS source, the pitch detector, the UI,
  the reference tone mode, the A4 calibration. Capacitor serves the built bundle from a
  local custom scheme inside WKWebView; zero-dependency vanilla TS is the best possible
  input for this — no framework adapter work.
- **Audio reality:** facts 1–4 above apply directly. Foreground: good. Background
  metronome: requires writing a Capacitor plugin (~150–250 lines of Swift) that owns an
  `AVAudioEngine`/`AVAudioPlayerNode`, schedules click buffers at exact sample times, and
  holds the audio session active. The JS side becomes a thin controller (tempo, start/
  stop, accent pattern) calling the plugin. The synthesized click can be pre-rendered to a
  short PCM buffer once and reused — the web code that synthesizes it can literally render
  it via OfflineAudioContext and hand the samples across the bridge, or the Swift side
  generates the same envelope in ten lines.
- **Requirements (verified):** Capacitor 8, Xcode 26.0 minimum, iOS 15+ deployment target.
- **Effort:** 1–2 evenings to a running on-device build; 3–4 more evenings for the native
  click plugin and session handling. I'm new to iOS but not to TS, and the Swift surface
  area here is small and well-documented.

### Option B — React Native

- **Carries over:** the math and the logic only — pitch detection, note mapping, scheduler
  arithmetic, calibration. All UI is rewritten in RN components. Web Audio does not exist
  in RN; the audio layer is rebuilt on a third-party package (e.g. Software Mansion's
  `react-native-audio-api`, which reimplements the Web Audio API natively — status as of
  writing unverified) or on hand-written native modules, and mic capture needs another
  native module either way.
- **Audio reality:** RN's JS thread has the same background-suspension problem as a
  webview; the metronome still ends up in native code. So RN costs a full UI rewrite and
  a new dependency tree, and the hard part (native audio) is not made easier.
- **Effort:** 12–20 evenings. Buys Android portability I didn't ask for, on an app whose
  UI is one screen.

### Option C — Native SwiftUI + AVAudioEngine rewrite

- **Carries over:** the algorithms as pseudocode. The MPM detector is ~100 lines and ports
  to Swift in an evening (or gets replaced by Accelerate/vDSP calls). The metronome
  becomes *simpler* than the web version: `AVAudioPlayerNode.scheduleBuffer(at:)` gives
  sample-accurate future scheduling directly; the lookahead hack exists only because Web
  Audio has no native "call me before the buffer runs dry."
- **Audio reality:** best in class. `.playAndRecord` + `.measurement` + a 5ms
  `preferredIOBufferDuration` gets round-trip latency far below anything a webview does,
  full control of routes and interruptions (phone call pauses, then resumes), and
  background audio is the platform default path. If Metrotuner grows a watch app or a
  widget, this is the only base that supports them without contortions.
- **Effort:** 15–25 evenings for me, most of it SwiftUI and iOS idiom learning, not audio.
  It also forks the codebase: the web page and the app drift apart permanently.

### Recommendation

**Option A, with the native click plugin from day one.** The tuner and UI ride the web
code unchanged; the metronome's timing-critical path is native, which is where it has to
be anyway; the codebase stays one codebase (web page and app share everything except ~200
lines of Swift). Option C is the better app in the limit, and the right move *if the app
finds an audience* — the plugin work in Option A is not wasted then, since the Swift click
engine transplants directly. Option B has no lane here.

The honest trade-off I'm accepting: the webview tuner will have WebKit's audio-session
behavior during mic use (volume dip on playback, limited processing control). For a
display-only tuner this is cosmetic. If A/B testing against a real instrument shows the
voice-processing hurts detection of low strings, the mic path moves into the same Swift
plugin later — that's a contained follow-up, not a rewrite.

---

## 2. App Store risk

### Guideline 4.2 — minimum functionality

The text (verified): *"Your app should include features, content, and UI that elevate it
beyond a repackaged website. If your app is not particularly useful, unique, or
'app-like,' it doesn't belong on the App Store."* Tuner/metronome is a saturated
category and a wrapped web page is the textbook 4.2 rejection. What makes this one pass:

- **Background audio.** The metronome keeps clicking with the screen locked. No web page
  can do this; it is the clearest possible "app-like" differentiator and it's real
  utility, not checkbox padding.
- **Fully offline.** Zero dependencies, all assets in the bundle, works in airplane mode.
- **Haptics on the beat.** Capacitor's Haptics plugin (or CoreHaptics in the click
  plugin) — cheap to add, genuinely useful for silent practice, and visibly native.
- **Native permission flow and no browser chrome.** No URL bar, no external navigation,
  proper mic prompt with a purpose string.
- Optional later, not required for v1: lock-screen/Now Playing controls, a home-screen
  widget for last tempo, a watch app. Listed in the review notes as "roadmap" costs
  nothing; building them for v1 delays shipping for marginal 4.2 credit.

Residual risk: 4.2 is judgment-based and the category is crowded. I'd put the rejection
odds for the feature set above at low but not zero. Mitigation is in the review notes
field: state explicitly that all processing is on-device, the app works offline, and the
metronome runs in background — reviewers don't always discover features unprompted.

### Guideline 2.5.2 — self-contained code

Apps *"may not download, install, or execute code which introduces or changes features."*
Concretely: the app must serve the bundled build, never load andrewshiau.com. In
Capacitor terms, no `server.url` in production config, no remote script tags, no
"check for updated JS" cleverness. This also happens to be what makes the offline claim
true. It rules out web-style silent updates; every change ships through App Review.
Accept that.

### Mic permission

`NSMicrophoneUsageDescription` in Info.plist is mandatory: without it the app crashes the
moment `getUserMedia` runs, and App Review rejects missing/vague purpose strings under
5.1.1 (*"Ensure your purpose strings clearly and completely describe your use of the
data"*). Use something specific:

> "Metrotuner listens to your instrument to detect its pitch. Audio is analyzed on this
> device and never recorded or sent anywhere."

WKWebView's getUserMedia prompt chains off the same permission, so one string covers it.

---

## 3. Shipping checklist

All Mac-side. In order:

1. **Apple Developer Program** — $99/year (verified). Enroll as an individual; activation
   is usually hours, can take up to 2 days. Start this first, it gates everything.
2. **Bundle ID** — `com.andrewshiau.metrotuner`, registered in the developer portal
   (Xcode automatic signing can create it). Also check the App Store name "Metrotuner" in
   App Store Connect early; names in this category are picked over, and finding out at
   submission time costs a naming scramble.
3. **Signing** — Xcode automatic signing with the personal team. Do not hand-manage
   provisioning profiles for a one-person app; automatic signing handles device debug,
   TestFlight, and distribution.
4. **Capabilities** — Background Modes → Audio (adds `UIBackgroundModes: [audio]` to
   Info.plist). This is a capability toggle, not a provisioned entitlement; no approval
   step.
5. **App icon** — one 1024×1024 PNG, no alpha; Xcode generates all sizes from the single
   asset (Xcode 14+ single-size icon).
6. **Screenshots** (spec verified 2026-08): the required size is now the **6.9" display**
   — 1290×2796 or 1320×2868 portrait (covers 16/17 Pro Max etc.). 6.5" (1284×2778) is the
   fallback tier; **6.1" (1179×2556) is optional** and auto-scaled if omitted. The old
   "6.7-inch required" rule is retired; shoot at 6.9" and let Apple scale down. 1–10
   images, PNG/JPEG, no alpha. `xcrun simctl io booted screenshot` on an iPhone 17 Pro Max
   simulator produces correctly sized captures.
7. **Privacy nutrition label** — in App Store Connect, declare **Data Not Collected**.
   Mic audio is processed on-device and never stored or transmitted, which is exactly the
   case the label's "collected" definition excludes. Keep the label, the purpose string,
   and the app description telling the same story; mismatches invite review questions.
8. **TestFlight** — internal testers (my own devices) get builds with no beta review
   wait. External testers require a one-time beta review, typically about a day. Internal
   is enough for this app.
9. **App Review** — Apple's own figure (verified): 90% of submissions reviewed in under
   24 hours. Budget 24–48h per round.
10. **Rejection loop cost** — a metadata-only rejection (purpose string wording,
    screenshot issue) resolves without a new build: fix, reply, re-review, ~1–2 days. A
    binary rejection (4.2 judgment, crash) costs a new build + upload + review: 2–4 days
    per loop. Budget one loop in the schedule; two would mean I misjudged section 2.

---

## 4. Staged plan (recommended path: Capacitor + native click plugin)

Units are working evenings (~2–3 focused hours). At 3 evenings/week this is roughly a
4–5 week calendar to Ready for Sale.

### Stage 0 — accounts and tooling (1 evening + waiting)
Enroll in the Developer Program (do first; activation runs in the background). Install
Xcode 26 (the download alone eats most of an evening). Mirror the metrotuner source into
a repo the Mac builds from. Exit: `xcodebuild -version` works, enrollment submitted.

### Stage 1 — wrap and run on device (1–2 evenings)
`npm i @capacitor/core @capacitor/cli && npx cap init && npx cap add ios`. Point the
webDir at the built page, add `NSMicrophoneUsageDescription`, build, run on my own
iPhone via cable. Exit: tuner detects pitch from the real mic on the real device,
reference tone plays, calibration slider works. (Simulator is useless for this stage —
its mic and audio path prove nothing.)

### Stage 2 — iOS audio housekeeping (2 evenings)
Handle what the web never had to: audio route (speaker, not earpiece, during mic use),
interruption handling (incoming call stops audio; resume cleanly), persistence of A4
calibration via the Preferences plugin (more durable than webview localStorage), safe-area
insets, disable webview zoom/bounce. Exit: a checklist pass on device — call during
metronome, headphones in/out mid-session, backgrounding and returning.

### Stage 3 — native metronome plugin (3–4 evenings)
The Swift click engine: `AVAudioEngine` + `AVAudioPlayerNode`, session
`.playAndRecord`/`.defaultToSpeaker`, click buffer scheduled with `scheduleBuffer(at:)`,
Background Modes → Audio. JS keeps tempo/UI; plugin owns time. Add haptics on the beat.
Exit criterion, measured not assumed: **start metronome at 120 BPM, lock the screen, come
back after 10 minutes of recorded audio, and verify click intervals in the recording are
metronome-steady** (an audio file and a 20-line analysis script, or just Audacity's
plot). That recording is the proof the app has a reason to exist.

### Stage 4 — tests (1–2 evenings)
Two layers, honestly scoped:
- **Reuse the web e2e suite** against the built bundle under Playwright's WebKit engine.
  This covers logic and UI (note math, calibration bounds, tempo controls) in the same
  engine family as WKWebView. It does not cover real audio hardware; nothing automated
  does.
- **One small XCUITest smoke**: app launches, webview renders, mic permission alert
  appears and is granted, metronome start button responds. Runs in CI-less mode — just
  `xcodebuild test` locally before each submission.
- The audio-hardware layer stays a written manual checklist (tune against a known 440 Hz
  source, the Stage 3 lock-screen recording, call interruption). Stating that boundary
  beats pretending a simulator test covered it.

### Stage 5 — store assets and TestFlight (1–2 evenings)
Icon, 6.9" screenshots from the simulator, description, privacy label, review notes (the
on-device/offline/background paragraph from section 2). Archive, upload, install via
TestFlight internal, use it for real practice for a few days. Exit: I have actually
practiced with it.

### Stage 6 — submit and ride the review (0.5 evening + 1–4 days waiting)
Submit for review. Expect 24–48h; budget one rejection loop (see 3.10). On approval,
release manually rather than auto — pick the moment. Exit: **Ready for Sale**.

**Total: 9–13 evenings of work**, plus review latency.

---

## 5. Costs

| Item | One-time | Recurring |
|---|---|---|
| Apple Developer Program | — | $99/yr (verified) |
| Xcode 26 | $0 | $0 |
| Capacitor 8 (MIT) | $0 | $0 |
| Mac + iPhone | already owned | — |
| Icon/screenshots (self-made) | $0 | — |
| Domain/hosting for web version | — | already paying (unchanged) |
| Maintenance: annual Xcode/iOS SDK churn, cert renewals are automatic | — | ~1–2 evenings/yr |
| **Year one total cash** | **$0** | **$99** |

The real cost is the ~9–13 evenings and the loss of web-style instant deploys: every fix
goes through a 24–48h review instead of an rsync.

---

## Verification notes

Verified against primary sources on 2026-08-03: Developer Program $99/yr
(developer.apple.com/support/enrollment), WKWebView getUserMedia since iOS 14.3
(webkit.org), Capacitor 8 current / Xcode 26 min / iOS 15+ target (capacitorjs.com),
guideline 4.2/2.5.2/5.1.1 text (developer.apple.com review guidelines), screenshot spec
with 6.9" required tier (App Store Connect reference), "90% of submissions reviewed in
under 24 hours" (developer.apple.com/distribute/app-review).

Marked unverified above and to be settled during Stage 2/3 on hardware: exact WKWebView
JS/audio behavior under the audio background mode across iOS versions; whether WKWebView
honors `echoCancellation: false`; current status of `react-native-audio-api` (moot under
the recommendation); precise webview output-latency figures.
