# Mobile financial management (Expo + Firebase)

Production-oriented React Native app built with **Expo** for personal finance: **Firebase Authentication** (email/password, persisted sessions), **Cloud Firestore** for per-user transactions, **Firebase Storage** for receipts, **React Context** for `Auth` and `Transactions`, dashboards with **react-native-gifted-charts**, **Animated** transitions on the dashboard, **FlatList** with **infinite scroll** (cursor-based Firestore pagination), filters, local title search over loaded pages, and a shared **add/edit** form with receipt upload.

## Prerequisites

- **Node.js** 20 LTS or newer (Expo SDK 55 expects Node ≥ 20.19.4).
- **npm** (or yarn/pnpm).
- **Expo Go** on a device, or an emulator (Android Studio / Xcode).

## Install dependencies

```bash
npm install
```

## Configure Firebase

### 1. Create a Firebase project

1. Open [Firebase Console](https://console.firebase.google.com/) and create a project.
2. In **Project settings**, add an app (Web) to obtain the client configuration object.

### 2. Enable Authentication

1. Go to **Build → Authentication → Sign-in method**.
2. Enable **Email/Password**.

### 3. Create Cloud Firestore

1. Go to **Build → Firestore Database**.
2. Create the database (production mode is fine once rules are deployed).
3. Deploy the rules in this repo so users only access their own data:

   - Rules file: `firebase/firestore.rules`
   - In the console: **Firestore → Rules**, paste the file contents, then **Publish**.

   Data layout:

   ```text
   users/{userId}/transactions/{transactionId}
   ```

   Each transaction document should include: `title`, `amount`, `category`, `date` (timestamp), `type` (`income` | `expense`), `receiptUrl` (string or null), `createdAt`, `updatedAt`.

### 4. Enable Storage

1. Go to **Build → Storage** and create a bucket.
2. Deploy `firebase/storage.rules` from this repo (**Storage → Rules** → paste → **Publish**).

   Receipts are stored under `receipts/{userId}/...`.

### 5. Add credentials to the app

1. Copy the example env file:

   ```bash
   cp .env.example .env
   ```

2. Fill in values from the Firebase web app config (Project settings → Your apps):

   | Variable | Maps to Firebase config field |
   |----------|------------------------------|
   | `EXPO_PUBLIC_FIREBASE_API_KEY` | `apiKey` |
   | `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` |
   | `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` |
   | `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
   | `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
   | `EXPO_PUBLIC_FIREBASE_APP_ID` | `appId` |

3. Restart the dev server after changing `.env` so Expo picks up `EXPO_PUBLIC_*` variables.

### 6. Firestore composite indexes (if prompted)

Queries combine `where` + `orderBy` (for example `type` + `createdAt`, or `date` range + `orderBy('date')`). The first time a query runs, the Firebase console may show an error with a **link to create the required composite index**. Follow that link for each suggested index.

## Run the application

```bash
npx expo start
```

Then press `a` (Android), `i` (iOS simulator), or scan the QR code with Expo Go.

Equivalent npm scripts:

```bash
npm start
npm run android
npm run ios
```

## Project structure (high level)

| Path | Role |
|------|------|
| `src/config/firebase.ts` | Firebase app, Auth (AsyncStorage persistence), Firestore, Storage |
| `src/contexts/AuthContext.tsx` | Login, register, logout, current user |
| `src/contexts/TransactionsContext.tsx` | List pagination, filters, analytics snapshot, add/update |
| `src/services/transactionsRepository.ts` | Firestore + Storage I/O |
| `src/screens/*` | Auth, Dashboard, Transactions list, Transaction form (add/edit) |
| `src/navigation/AppNavigator.tsx` | Auth vs main stack, tabs, modal form |
| `firebase/*.rules` | Example security rules |

## Behavior notes

- **Search**: filters transaction **titles** among items already loaded (and paginated) in the list; load more to include older matches.
- **Receipts**: on **edit**, choosing a file uploads immediately and updates Firestore. On **create**, the file is uploaded after the transaction is saved.
- **Dashboard analytics** use the latest chunk of transactions (see `ANALYTICS_LIMIT` in `transactionsRepository.ts`) to keep reads bounded.

## License

Private / educational use (FIAP coursework).
