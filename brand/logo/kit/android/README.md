# Android icon files

Copy these into the Android app module:

```text
app/src/main/res/
├── drawable/
│   ├── ic_launcher_background.xml
│   ├── ic_launcher_foreground.xml
│   └── ic_launcher_monochrome.xml
└── mipmap-anydpi-v26/
    ├── ic_launcher.xml
    └── ic_launcher_round.xml
```

The manifest uses:

```xml
android:icon="@mipmap/ic_launcher"
android:roundIcon="@mipmap/ic_launcher_round"
```

- **Background:** Salo Green `#1F5C45`.
- **Foreground:** Warm Cream `#F7FBF4` Salo S, scaled to about 61% of the canvas.
- **Monochrome:** black S on transparent for Android 13+ themed icons.
- **Safe zone:** the S sits inside the adaptive-icon safe zone; do not enlarge it.
