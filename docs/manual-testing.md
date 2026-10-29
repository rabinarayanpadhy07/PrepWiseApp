# Manual testing checklist

The automated suites (backend `pytest`, frontend `npm test`) cover API behaviour, authorization, quotas,
AI failure handling, and the voice UI against a **simulated** speech recognition object. They can't cover:

- real microphones and the browser's own speech recognition service
- browser permission prompts
- real devices and screen sizes
- the live Anthropic API
- real email delivery

Run this checklist before a release and after changes to authentication, voice, or the AI layer. Record
the browser, OS, device, and date for each run.

## Setup

- Backend with a real `ANTHROPIC_API_KEY` (or a user with a BYOK key) and a test user with an active
  subscription. AI calls made during testing are billed.
- Frontend built and served (`npm run build && npm run preview`), plus the dev server for quick checks.
- Voice needs a **secure context**: `http://localhost` works, but testing from another device needs HTTPS
  (for example a tunnel or a staging deployment). Over plain HTTP on a LAN IP, the microphone is blocked.

## 1. Browser support for voice

Voice answers use the Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`). Support varies,
and in Chrome and Edge the audio is sent to the browser vendor's speech service.

| Browser | Expected |
| --- | --- |
| Chrome (desktop, Android) | Voice available |
| Edge (desktop) | Voice available |
| Safari (macOS, iOS) | Voice available on recent versions; verify on each target version |
| Firefox | Voice **unsupported**: the app shows the "type your answer" fallback and no record button |
| Other Chromium browsers (Brave, Opera, etc.) | May expose the API but fail with a service error; check the error message is shown |

For each browser:

- [ ] Starting a voice interview shows the record button only where supported.
- [ ] Unsupported browsers can still complete the interview by typing.
- [ ] The privacy note about the browser's speech service is visible before recording.

## 2. Microphone permission

- [ ] First recording shows the browser's permission prompt; nothing records before the user allows it.
- [ ] **Allow:** state changes to *Listening*, the timer counts up, and interim text appears.
- [ ] **Block:** the app shows the "microphone access is blocked" message with how to re-enable it, and
      typing still works.
- [ ] **Revoke** permission in site settings after granting it, then record again: the blocked message
      appears; no silent failure.
- [ ] **No microphone** connected (or disabled in the OS): the "couldn't find a microphone" message appears.
- [ ] Unplug or switch the input device **while recording**: recording stops with an error, and any text
      already transcribed is kept for editing.
- [ ] OS-level microphone privacy setting off (Windows *Settings → Privacy → Microphone*, macOS
      *Privacy & Security → Microphone*): an error is shown, not an endless *Listening* state.

## 3. Recording flow

- [ ] States are shown in order: idle → *Listening* → *Processing* → transcript ready.
- [ ] **Stop** ends recording immediately and the transcript appears in the editable text box.
- [ ] Silence only: the "we didn't hear anything" message appears.
- [ ] Recording stops automatically at the per-answer limit (3 minutes by default, lower if the remaining
      voice allowance is smaller), and the timer never shows more than the limit.
- [ ] The transcript can be edited before submitting; the submitted text is the edited text.
- [ ] Recording again appends to or replaces the transcript as the UI describes.
- [ ] After submitting, the voice usage shown on the dashboard / settings goes up by roughly the recorded time.
- [ ] When the voice allowance is used up, the record button is disabled with an explanation, and typed
      answers still work.
- [ ] Non-English browser language: recognition falls back to `en-US`; check transcripts are sensible.
- [ ] Accented or fast speech: transcripts are imperfect; confirm users can correct them, and that the
      UI never claims transcription or scoring is exact.

## 4. Network failures

- [ ] Go offline (DevTools → Network → Offline, or disconnect Wi-Fi) **while recording** in Chrome: the
      network error message appears and the transcript so far is kept.
- [ ] Go offline **before submitting** an answer: the submit error is shown, the draft stays in the text
      box (and survives a reload), and submitting again after reconnecting doesn't create a duplicate answer.
- [ ] Slow connection (DevTools *Slow 3G*) while starting an interview or requesting feedback: loading
      states are shown and the request isn't sent twice by double-clicking.
- [ ] Close the tab mid-interview and reopen it from **Interviews**: it resumes at the next unanswered question.

## 5. Read aloud

- [ ] *Read aloud* speaks the question where `speechSynthesis` exists, and is hidden where it doesn't.
- [ ] Starting a recording or moving to the next question stops speech that's playing.
- [ ] The question isn't picked up by the microphone as part of the answer (test with speakers, not headphones).

## 6. Cross-device and layout

Test on at least: one Windows or macOS desktop, one Android phone (Chrome), and one iPhone (Safari).

- [ ] 320 px wide (iPhone SE size), 375 px, 768 px, and 1280 px or more: no horizontal scrolling, nothing
      clipped, buttons reachable. Check the public pages, dashboard, resume upload, interview, and progress charts.
- [ ] The mobile navigation opens, closes, and traps focus.
- [ ] Resume upload works from the phone's file picker (including files from cloud storage apps).
- [ ] On iOS, the on-screen keyboard doesn't cover the answer box or the submit button.
- [ ] Screen orientation change during recording doesn't lose the transcript.
- [ ] Keyboard only (desktop): every action, including record/stop and dialogs, works without a mouse.
- [ ] Screen reader spot check (NVDA or VoiceOver): recording state changes and errors are announced.

## 7. Sessions and authentication

- [ ] Open the app in two tabs, wait for the access token to expire (15 minutes by default, or set
      `JWT_ACCESS_TOKEN_MINUTES=1`), then act in both tabs: both stay signed in and neither is logged out.
- [ ] Log out in one tab: the other tab is signed out the next time it needs a new access token
      (at most the access-token lifetime, or on reload).
- [ ] Reload a signed-in page: you stay signed in. In DevTools, `localStorage` and `sessionStorage` have no
      tokens, and the `prepwise_refresh` cookie is `HttpOnly`, `SameSite=Lax`, and (on HTTPS) `Secure`.
- [ ] Use `127.0.0.1` for the frontend while the API is on `localhost`: you are signed out on reload.
      This is expected (see the root README), not a bug.
- [ ] Change the password in one browser: sessions in other browsers are signed out.
- [ ] Safari with "Prevent cross-site tracking" on, with the frontend and API on different sites: confirm
      the refresh cookie is still sent, or deploy them on the same site.

## 8. Live AI (Anthropic, OpenAI, Gemini)

Configure at least one AI model and enable the Fast mode in the Django admin first, using model IDs
and prices from each provider's documentation.

- [ ] For each provider: saving a valid BYOK key succeeds and shows only `••••` plus the last four
      characters; an invalid key is rejected with a clear message and nothing is saved.
- [ ] With both a subscription and a key, each AI form asks which to use; the dashboard shows the
      usage under the chosen one only.
- [ ] Make a BYOK request fail (for example revoke the key at the provider): the request fails and is
      not retried on platform AI.
- [ ] With fallback allowed on a mode, make the primary model unavailable: the cheaper fallback model
      answers, and the recorded usage names the fallback model.
- [ ] Resume analysis, interview questions, and answer feedback all complete with real output, labelled
      *AI-generated*, and the content matches the resume and job description (no invented experience).
- [ ] Platform AI with an active subscription: token usage on the dashboard goes up after each AI action.
- [ ] Revoke or exhaust the API key: the app shows a provider error, nothing is saved as a successful
      result, and failed analyses can be retried.
- [ ] Response times stay under the server and proxy timeouts (`AI_REQUEST_TIMEOUT_SECONDS`, Gunicorn
      `--timeout`); long requests show a loading state the whole time.

## 9. Payments (Razorpay test mode)

Use your own Razorpay **test-mode** keys and a webhook pointing at the API (a tunnel works locally).

- [ ] **Billing → Buy now** opens Razorpay Checkout for the plan price stored in the backend.
- [ ] A successful test payment shows *Payment confirmed* only after verification; the subscription
      period, usage meters and an invoice download appear.
- [ ] A failed test payment shows the gateway's reason; closing the window shows *Payment cancelled*;
      neither grants access.
- [ ] Buying again during an active period queues the next period from the current end date.
- [ ] Redeliver the same webhook from the Razorpay dashboard: no second subscription or invoice.
- [ ] A full refund from the dashboard revokes access; a partial refund keeps it.
- [ ] The invoice PDF opens and shows the seller details, period and amount, with no tax lines.

## 10. Email

- [ ] With SMTP configured, *Forgot password* delivers an email with a working link to `FRONTEND_URL`.
- [ ] The link works once; using it again, or after `PASSWORD_RESET_TIMEOUT_SECONDS`, shows an
      "invalid or expired link" message.
- [ ] Requesting a reset for an unknown email shows the same message as for a known one.
