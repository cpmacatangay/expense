# Android release notes

## Prerequisites

- JDK 21
- Android Studio / Android SDK with a device or emulator
- A release keystore

## Build the web bundle and sync

```bash
npm run build
npx cap sync android
```

`npx cap sync` copies `dist/` into `android/app/src/main/assets/public` and updates the native
plugin configuration. Run it after every web build or native plugin change.

## Open in Android Studio

```bash
npx cap open android
```

Then run the `app` configuration on a physical device. The first run should be used to validate:

- camera permission and native capture;
- ML Kit text recognition on a real receipt;
- the share sheet for the recap;
- Google sign-in (see below);
- airplane-mode capture, assignment, finalize, and settlement.

## Release signing

Create a keystore outside the repository:

```bash
keytool -genkeypair -v -keystore salo-release.keystore -alias salo \
  -keyalg RSA -keysize 2048 -validity 10000
```

Add `android/key.properties` (do not commit it):

```properties
storePassword=...
keyPassword=...
keyAlias=salo
storeFile=../salo-release.keystore
```

Configure `android/app/build.gradle` to use the keystore for the release build, then:

```bash
cd android
./gradlew assembleRelease
```

The APK is written under `android/app/build/outputs/apk/release/`. Distribute it by link; Android
users enable "Install unknown apps" for their browser or file manager. No Play Store listing is
required.

## Google sign-in

1. Create a Google Cloud OAuth client of type **Android** with package `ph.salo.app` and the SHA-1 of
   the release keystore.
2. Create a **Web** OAuth client for the PWA and the native server client ID.
3. Put the web client ID in `VITE_GOOGLE_WEB_CLIENT_ID`.
4. In `@capgo/capacitor-social-login`, initialize with the web client ID as both the web client and
   the iOS server client ID (see `src/lib/platform/auth.native.ts`).
5. Add the PWA origin and `/auth/callback` to Supabase Auth redirect URLs.

Only Google is bundled; Facebook, Apple, and Twitter providers are disabled in
`capacitor.config.ts`.

## ML Kit

`@capacitor-mlkit/text-recognition` bundles the Latin model. The adapter calls
`TextRecognition.processImage({ path, script: Script.Latin })` with the native camera file path. The
plugin is configured in `capacitor.config.ts` and installed under `android/`; no additional model
download is required for the Latin script.

## Distribution checklist

- [ ] Web bundle rebuilt and synced
- [ ] Release keystore configured
- [ ] SHA-1 added to the Google Android OAuth client
- [ ] `VITE_SUPABASE_*` and `VITE_GOOGLE_WEB_CLIENT_ID` set for the build
- [ ] Camera, ML Kit, share, and offline flows tested on a physical device
- [ ] APK signed and installed from a clean state
- [ ] PWA deployed and installed on an iPhone for the other adults
