# Household Recipe Planner

A static recipe and meal planning app that can run from GitHub Pages.

## Local use

Run the app through a local web server, such as `python -m http.server 8000`, then open `http://localhost:8000`. Firebase authentication redirects do not work when `index.html` is opened as a `file://` URL.

## GitHub Pages

1. Create a GitHub repository and push these files.
2. In the repository, go to **Settings > Pages**.
3. Set the source to the `main` branch and root folder.
4. Open the GitHub Pages URL after it finishes deploying.

## Login and sync

The app uses Firebase Authentication and Cloud Firestore as its only data store. Users must sign in before recipes, plans, or Walmart mappings can be changed.

1. Create a Firebase project.
2. Enable **Authentication > GitHub**.
3. Create a **Cloud Firestore** database.
4. Add your GitHub Pages domain to **Authentication > Settings > Authorized domains**.
5. In `firebase-config.js`, replace `null` with the config from **Project settings > Your apps > Web app**.
6. For GitHub sign-in, paste Firebase's callback URL into GitHub's OAuth app **Redirect URI** field, then paste the GitHub client ID and client secret back into Firebase.

Example:

```js
window.firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

Recommended Firestore rules:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Walmart links

The Walmart tab lets you map household ingredients to preferred Walmart product URLs. The grocery list will use saved product links when available and fall back to Walmart search links for unmapped items.

Walmart does not currently provide a simple public consumer API for writing directly to a shopper's native Walmart List from a static GitHub Pages app.
