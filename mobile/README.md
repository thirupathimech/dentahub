# DentaHub Mobile

Expo + React Native Android app for the DentaHub backend. The first mobile slice includes:

- Login with the existing `/api/auth/login` endpoint
- Persistent session on the device
- Dashboard summary and today's appointments
- Patient search/list
- Today's appointments list
- Account screen and sign out

## Local development

```powershell
Copy-Item .env.example .env
npm install
npm start
```

The default API URL is `http://10.0.2.2:8080`, which points an Android emulator to the host machine. For a physical phone, set `EXPO_PUBLIC_API_BASE_URL` in `.env` to the computer's LAN IP, for example `http://192.168.1.10:8080`.

## Android APK

Install EAS CLI once, log in, and create an Android preview build:

```powershell
npm install -g eas-cli
eas login
npm run build:android
```

`build:android` produces an installable Android preview artifact. Update the Android package name or app icon in `app.json` before publishing to the Play Store.
