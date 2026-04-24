# Smart Attendance Backend

This is a simple Node.js + Firebase backend for your IoT smart attendance system.

## Architecture

### Recommended flow

1. Student reaches the classroom gate.
2. ESP32 reads the RFID card UID.
3. ESP32 sends the UID to the backend API.
4. Node.js verifies the UID against Firebase Firestore.
5. If valid, the backend creates attendance data for that day.
6. The API returns a success or failure response to the ESP32.
7. OLED shows `Attendance Marked`, `Already Marked`, or `Card Not Registered`.

### Why this architecture works well

- ESP32 stays lightweight and only handles hardware.
- Backend owns verification and attendance rules.
- Firebase stores both master student data and scan history.
- You can later add a web dashboard without changing the device logic.

## Firestore structure

Use these collections:

### `students`

Document ID should be the normalized RFID UID.

Example document:

```json
{
  "uid": "04A1B2C3D4",
  "name": "Aarav Sharma",
  "rollNo": "22CS101",
  "department": "CSE",
  "year": "3",
  "active": true,
  "createdAt": "2026-04-22T10:30:00.000Z"
}
```

### `attendance_daily`

Document ID format:

```text
YYYY-MM-DD_UID
```

This prevents duplicate attendance for the same student on the same day.

### `attendance_logs`

This stores every scan attempt:

- accepted
- duplicate
- rejected

That gives you a useful audit trail for demos and debugging.

## Setup steps

### 1. Create Firebase project

In Firebase console:

- create a project
- enable Firestore Database
- go to Project Settings
- open Service Accounts
- generate a new private key

Save that JSON file in the project root as:

```text
firebase-service-account.json
```

### 2. Create environment file

Copy `.env.example` to `.env` and update the values.

Required:

```env
PORT=3000
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
FIREBASE_DATABASE_URL=
```

### 3. Install dependencies

```bash
npm install
```

### 4. Run the backend

Development:

```bash
npm run dev
```

Production:

```bash
npm start
```

### 5. Test the API

Health check:

```bash
curl http://localhost:3000/health
```

Register a student:

```bash
curl -X POST http://localhost:3000/api/students \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "04 A1 B2 C3 D4",
    "name": "Aarav Sharma",
    "rollNo": "22CS101",
    "department": "CSE",
    "year": "3",
    "active": true
  }'
```

Verify a scan:

```bash
curl -X POST http://localhost:3000/api/attendance/scan \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "04 A1 B2 C3 D4",
    "deviceId": "esp32-gate-1",
    "gateId": "classroom-a"
  }'
```

## API summary

### `GET /health`

Checks if the backend is running.

### `POST /api/students`

Creates or updates a student in Firestore.

Body:

```json
{
  "uid": "04A1B2C3D4",
  "name": "Aarav Sharma",
  "rollNo": "22CS101",
  "department": "CSE",
  "year": "3",
  "active": true
}
```

### `GET /api/students/:uid`

Fetches one student by RFID UID.

### `POST /api/attendance/scan`

Validates a scan and marks attendance.

Body:

```json
{
  "uid": "04A1B2C3D4",
  "deviceId": "esp32-gate-1",
  "gateId": "classroom-a",
  "scannedAt": "2026-04-22T10:35:00.000Z"
}
```

## Suggested next step for your ESP32 teammate

The ESP32 should call only one endpoint:

```text
POST /api/attendance/scan
```

Then read the response:

- `ATTENDANCE_MARKED`
- `ALREADY_MARKED`
- `STUDENT_NOT_FOUND`

That response can be used directly for the OLED display.
