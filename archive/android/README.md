# Archived Android app

This is the original Kotlin/Jetpack Compose Salo app. It is superseded by the shared PWA and is kept
for reference and recovery only.

## What is here

- `app/` — the Kotlin source, resources, schemas, and Gradle module.
- `gradle/`, `gradlew`, `gradlew.bat`, `build.gradle.kts`, `settings.gradle.kts`, `gradle.properties`
  — the original build.
- `supabase/` — the old backup/snapshot migrations used by the native app. The PWA uses a new,
  isolated Supabase project at the repository root.
- `.gradle/`, `.kotlin/`, `build/`, `.idea/` — local build and IDE state.

## Secrets are not archived

`keystore.properties` and `local.properties` were moved to `.secrets/` at the repository root, which
is ignored by Git. They are deliberately outside this folder.

To build the archived app again, copy them back first:

```powershell
Copy-Item ..\..\.secrets\keystore.properties .
Copy-Item ..\..\.secrets\local.properties .
.\gradlew.bat assembleDebug
```

Do not run the archived Gradle build from the PWA repository root.

## Old local data

The old Android local database lives on the device or emulator, not in this repository. Keep any
exported backup outside version control. The PWA starts fresh and does not import it automatically.
