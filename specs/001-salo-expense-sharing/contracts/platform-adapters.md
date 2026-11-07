# Contract: Platform Adapters

**Module**: `src/lib/platform/` | **Consumers**: receipt capture, auth, sharing, settings

Feature code depends on these interfaces, never on Capacitor or browser APIs directly. The adapter
factory selects the implementation at runtime:

```ts
const isNative = Capacitor.isNativePlatform();
```

## Camera and Image Capture

```ts
interface CapturedImage {
  blob: Blob;
  width: number;
  height: number;
  mime: 'image/jpeg' | 'image/png';
  source: 'camera' | 'gallery';
}

interface CameraAdapter {
  capture(): Promise<CapturedImage | null>; // null when the user cancels
  pick(): Promise<CapturedImage | null>;
}
```

- **Android**: `@capacitor/camera` with `CameraSource.Camera` / `CameraSource.Photos`, quality 90,
  URI result, converted to a Blob.
- **Web/PWA**: `<input type="file" accept="image/*" capture="environment">` for capture and a
  gallery input without `capture`. Use `createImageBitmap` for EXIF-correct decoding.
- Permission denial returns a typed error (`camera.permission_denied`) that the UI explains.

## Photo Storage

```ts
interface PhotoStore {
  save(id: string, outingId: string, blob: Blob): Promise<void>;
  load(id: string): Promise<Blob | null>;
  remove(id: string): Promise<void>;
  markUploaded(id: string, remotePath: string): Promise<void>;
}
```

- Both targets store the compressed blob in IndexedDB (`LocalPhoto`).
- Remote copies live in the private Supabase bucket; viewing uses signed URLs.
- A local copy is the fallback when the remote upload is pending or fails.

## Share

```ts
interface ShareAdapter {
  shareText(text: string): Promise<boolean>;
  shareImage(blob: Blob, filename: string, text?: string): Promise<boolean>;
  copyText(text: string): Promise<boolean>;
  downloadImage(blob: Blob, filename: string): Promise<void>;
}
```

- **Android**: `@capacitor/share` for text and files.
- **Web/PWA**: `navigator.share` for text and files when available; fall back to
  `navigator.clipboard.writeText` and an image download link.
- The feature layer builds the recap content; the adapter only delivers it.

## Authentication

```ts
interface AuthAdapter {
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  getSession(): Promise<Session | null>;
  onAuthStateChange(callback: (session: Session | null) => void): () => void;
}
```

- **Web/PWA**: Supabase `signInWithOAuth({ provider: 'google' })` with a redirect to
  `/auth/callback`.
- **Android**: `@capgo/capacitor-social-login` Google sign-in with the web client ID as the server
  client ID, then `supabase.auth.signInWithIdToken`.
- Both adapters end with the same Supabase session shape.

## Install and Platform Info

```ts
interface InstallAdapter {
  platform: 'android' | 'ios' | 'web';
  isStandalone(): boolean;
  canPromptInstall(): boolean;
  promptInstall(): Promise<boolean>;
  instructions(): string | null;
}
```

- Android native: `isStandalone()` is true; no install prompt is shown.
- Android Chrome PWA: use `beforeinstallprompt` when available.
- iOS Safari: show the Share → Add to Home Screen instructions.
- The settings screen always offers manual install instructions as a fallback.

## Error Contract

All adapters return typed errors instead of throwing raw platform errors:

```ts
type PlatformErrorCode =
  | 'camera.permission_denied'
  | 'camera.unavailable'
  | 'share.unavailable'
  | 'share.cancelled'
  | 'auth.cancelled'
  | 'auth.failed'
  | 'storage.quota_exceeded'
  | 'ocr.unavailable'
  | 'ocr.failed';

class PlatformError extends Error {
  code: PlatformErrorCode;
  cause?: unknown;
}
```

The UI maps each code to a short, actionable message and never exposes raw stack traces.

## Test Requirements

- Web adapter tests in Playwright with a mocked camera input and Web Share API.
- Android adapter manual tests: camera permission, photo capture, share sheet, Google sign-in.
- Fallback tests: denied permission, cancelled share, unavailable clipboard, quota exceeded.
