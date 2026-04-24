const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./firebase-service-account.json";

const resolvedPath = path.resolve(serviceAccountPath);

if (!fs.existsSync(resolvedPath)) {
  throw new Error(
    `Firebase service account file not found at ${resolvedPath}. ` +
      "Create it from your Firebase project settings."
  );
}

const serviceAccount = require(resolvedPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL || undefined
  });
}

const db = admin.firestore();

module.exports = { admin, db };
