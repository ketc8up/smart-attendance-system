const { db, admin } = require("../config/firebase");
const { getStudentByUid, normalizeUid } = require("./studentService");

function getAttendanceDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function normalizeAction(action = "ENTRY", type) {
  return (action || type || "ENTRY").toString().trim().toUpperCase();
}

async function verifyAndMarkAttendance({
  uid,
  deviceId = "esp32-gate-1",
  gateId = "main-gate",
  scannedAt,
  action,
  type
}) {
  const normalizedUid = normalizeUid(uid);
  const normalizedAction = normalizeAction(action, type);
  const eventTime = scannedAt || new Date().toISOString();

  if (!normalizedUid) {
    return {
      success: false,
      code: "INVALID_UID",
      message: "UID is required."
    };
  }

  const student = await getStudentByUid(normalizedUid);

  if (!student) {
    await db.collection("attendance_logs").add({
      uid: normalizedUid,
      status: "rejected",
      reason: "student_not_found",
      action: normalizedAction,
      deviceId,
      gateId,
      scannedAt: eventTime,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: false,
      code: "STUDENT_NOT_FOUND",
      message: "Card not registered.",
      uid: normalizedUid
    };
  }

  if (student.active === false) {
    return {
      success: false,
      code: "STUDENT_INACTIVE",
      message: "Student is inactive.",
      student
    };
  }

  const attendanceDate = getAttendanceDate(new Date(eventTime));
  const dailyRecordId = `${attendanceDate}_${normalizedUid}`;
  const dailyRecordRef = db.collection("attendance_daily").doc(dailyRecordId);
  const logRef = db.collection("attendance_logs").doc();

  const result = await db.runTransaction(async (transaction) => {
    const existingRecord = await transaction.get(dailyRecordRef);

    if (normalizedAction === "EXIT") {
      if (!existingRecord.exists) {
        transaction.set(
          logRef,
          {
            uid: normalizedUid,
            studentName: student.name,
            status: "rejected",
            reason: "entry_not_found",
            action: "EXIT",
            attendanceDate,
            deviceId,
            gateId,
            scannedAt: eventTime,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          },
          { merge: true }
        );

        return {
          success: false,
          code: "ENTRY_NOT_RECORDED_TODAY",
          message: "Entry not recorded for today.",
          attendanceDate,
          student
        };
      }

      const attendanceRecord = existingRecord.data();

      if (attendanceRecord.exitScannedAt) {
        transaction.set(
          logRef,
          {
            uid: normalizedUid,
            studentName: student.name,
            status: "duplicate",
            reason: "exit_already_marked",
            action: "EXIT",
            attendanceDate,
            deviceId,
            gateId,
            scannedAt: eventTime,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          },
          { merge: true }
        );

        return {
          success: true,
          code: "EXIT_ALREADY_MARKED",
          message: "Exit already marked for today.",
          attendanceDate,
          student
        };
      }

      transaction.set(
        dailyRecordRef,
        {
          exitScannedAt: eventTime,
          exitDeviceId: deviceId,
          exitGateId: gateId,
          exitStatus: "exited",
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );

      transaction.set(
        logRef,
        {
          uid: normalizedUid,
          studentName: student.name,
          status: "accepted",
          reason: "exit_marked",
          action: "EXIT",
          attendanceDate,
          deviceId,
          gateId,
          scannedAt: eventTime,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );

      return {
        success: true,
        code: "EXIT_MARKED",
        message: "Exit marked successfully.",
        attendanceDate,
        student
      };
    }

    if (existingRecord.exists) {
      transaction.set(
        logRef,
        {
          uid: normalizedUid,
          studentName: student.name,
          status: "duplicate",
          reason: "already_marked_today",
          action: "ENTRY",
          attendanceDate,
          deviceId,
          gateId,
          scannedAt: eventTime,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );

      return {
        success: true,
        code: "ALREADY_MARKED",
        message: "Attendance already marked for today.",
        attendanceDate,
        student
      };
    }

    transaction.set(dailyRecordRef, {
      uid: normalizedUid,
      studentName: student.name,
      rollNo: student.rollNo || "",
      department: student.department || "",
      attendanceDate,
      firstScannedAt: eventTime,
      deviceId,
      gateId,
      status: "present",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    transaction.set(logRef, {
      uid: normalizedUid,
      studentName: student.name,
      status: "accepted",
      reason: "entry_marked",
      action: "ENTRY",
      attendanceDate,
      deviceId,
      gateId,
      scannedAt: eventTime,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      code: "ATTENDANCE_MARKED",
      message: "Attendance marked successfully.",
      attendanceDate,
      student
    };
  });

  return result;
}

module.exports = {
  verifyAndMarkAttendance
};
