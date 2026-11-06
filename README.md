# Palak: a blink becomes a voice

*Palak* (पलक) is Hindi for eyelid.

Palak is a free desktop app for people who cannot speak or use their hands, after a stroke or with ALS, for example. It needs only a laptop webcam. A highlight steps through a board of everyday phrases. The person holds a long blink to choose one, and Palak speaks it aloud in English or Hindi.

Eye-gaze communication devices often cost more than a family can pay. Palak runs on a laptop the family already has.

## What it does

- **Phrase board.** Call for help, yes, no, pain, water, food, toilet, medicine, turn me over, too hot or cold, call the nurse or family, thank you, and more. Each phrase is shown in English and Hindi, and spoken in the language you pick.
- **Long blink to select.** A natural blink (about 100 to 300 ms) is ignored. A deliberate long blink (0.5 to 5 s) selects. Eyes closed for longer (resting) select nothing. The highlight holds still while the eyes are shut, so the choice is the one they closed their eyes on.
- **Calibration.** 20 seconds: blink normally, then do three long blinks. Palak sets the threshold from that person's own blinks.
- **Pauses while the person talks.** If they can say a few words, talking never triggers a choice.
- **Raised eyebrows as a second switch** (optional), for people whose blinks are weak.
- **Letter board** for anything not on the phrase board, with the most common letters first and word suggestions (type W, A and WATER is one select away).
- **Your own phrases.** A caregiver types up to five phrases ("Call Mummy", "Switch on the fan") and they appear as a "Mine" row.
- **Eye meter.** A live bar shows the caregiver whether Palak sees the eyes open, closed, or no face at all.
- **Never scans blind.** If the face is badly placed, the board pauses and says what to fix ("Move up, or tilt the camera down"). If the SDK stops after an error, Palak restarts it on its own.
- **Call for help.** It is the first item on the board, so it is two selects away. Four quick long blinks also sound the alarm from anywhere. A caregiver stops it with "I'm here".
- **Space bar or any USB switch** works as a select too, so a caregiver can try the board.

## How it uses the Presage SmartSpectra SDK

Palak runs the [SmartSpectra SDK](https://github.com/Presage-Security/SmartSpectra) in Electron, using the camera's face signals:

| Signal | Used for |
|---|---|
| `face.landmarks` (478 points) | eye openness from the six points around each eye: the long-blink switch, calibration and the eye meter |
| `face.talking` | pausing the board while the person speaks |
| `face.expression` (surprise score) | the optional raised-eyebrows switch |
| validation hints | on-screen help for the caregiver ("Face the camera", "Increase light on face") |

The SDK's own `face.blinking` flag marks only the moment of a blink, not how long the eyes stay shut, so Palak measures a held blink from the eye landmarks (the eye aspect ratio) against each person's own open-eye level. The face tracker drops landmarks while the eyes are fully shut, so a gap right after the eyes start closing counts as closed. This was tuned and tested on a real recording (`fixtures/eyes-1.json`, eye points only).

The camera stream runs at 640x360 and 30 fps, which keeps the SDK's frame rate on an ordinary laptop CPU. Palak picks the built-in camera over virtual cameras.

## Camera consent and data handling

- The camera turns on only after the caregiver or user presses **Turn on the camera and start**, and turns off with **Stop camera**.
- Video is processed on this computer. Palak does not record, upload or save any video, image or measurement.
- SDK telemetry is turned off (`enableTelemetry: false`). The SDK still checks the API key with Presage's server.
- The only thing saved is the settings (scan speed, language, blink threshold, the caregiver's own phrases), kept in the app's local storage on this computer.
- Palak is a communication aid. It does not diagnose, treat or monitor any condition.

## Setup

Requires Windows x64, macOS (Apple Silicon) or Linux x64, Node.js 20 or newer, and a webcam.

```bash
git clone <this repo>
cd palak
npm install
cp .env.example .env        # then paste your API key from physiology.presagetech.com
npm start
```

- Check the camera on its own: `node tools/camera-check.mjs 30` prints which face signals arrive.
- Record your own face data: `node tools/record-face.mjs out.json 30`.
- Replay a recorded clip instead of the camera: `npx electron . --replay=clip.mp4` (add `--background` to run without a window, for automated checks).
- Run the tests: `npm test`.

## Tips

- Sit alone in the frame, face the camera, with light on the face. The SDK stops if it sees two faces.
- Start with a slow scan speed (2 to 3 s) and calibrate once per person.

## Limits

- Blink detection depends on light and camera position. Run calibration again if choices are missed or happen by accident.
- Speech uses the voices installed on the computer. For Hindi, add a Hindi voice in Windows settings.

## License

MIT. The SmartSpectra SDK has its own license from Presage Technologies.

---

Made by **Wageesha Tripathi** · [LinkedIn](https://www.linkedin.com/in/wst2002/) · [Email](mailto:tripathiwageesha2002@gmail.com) · [GitHub](https://github.com/WST2002) · [YouTube](https://www.youtube.com/@wst2002rk)
