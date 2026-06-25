# Gangsters Split — Android App

React Native (Expo) expense splitter for your squad. Replaces the old PWA with a native Android experience.

## Stack

- **Expo SDK 56** + TypeScript
- **Expo Router** (file-based navigation)
- **Firebase Realtime Database** (same backend as before)
- Light / dark mode with a new indigo-violet design system
- English + Arabic (RTL)

## Squad (default)

| Name | Role |
|------|------|
| El Maro | Admin — can add members from Admin tab |
| El Kemo | Member |
| El Back | Member |
| Abdo | Member (new) |

Members are stored in Firebase at `config/members` and can be extended from the Admin panel.

## Features

- Dashboard with debt cards, InstaPay links, settlement workflow
- Quick add + shopping trip expense modes
- WhatsApp share + auto-archive
- Expense history by date
- Push-style local notifications when someone adds an expense
- Spending threshold humor popup (400+ EGP)
- Auto-archive after 6 hours
- Haptic feedback on key actions

## Setup

```bash
cd mobile
npm install
npm run android
```

Requires [Android Studio](https://developer.android.com/studio) with an emulator or a USB-connected device with USB debugging enabled.

### Optional: balance sounds

Copy these from your old web project into `mobile/assets/sounds/`:

- `sound.mp3` — expenses tab intro
- `sound-bahgat.mp3` — you're owed money
- `3adel-shakal.mp3` — you owe money

The app works without them; sounds are skipped if files are missing.

### Firebase

Uses the existing `gangsters-split` Firebase project. Members are auto-seeded on first launch if `config/members` is empty.

### Build APK (production)

```bash
npx eas build --platform android --profile preview
```

(Requires [EAS CLI](https://docs.expo.dev/build/setup/) and an Expo account.)

## Project structure

```
mobile/
├── app/                 # Expo Router screens
├── src/
│   ├── components/      # UI screens & widgets
│   ├── context/         # App state, theme
│   ├── lib/             # Firebase, calculations, i18n
│   └── theme/           # Colors, spacing, typography
└── assets/
```

## Admin (El Maro only)

The **Admin** tab lets Maro add new squad members with optional InstaPay details. Existing expense data is unchanged — new members appear in split pickers immediately for everyone.
