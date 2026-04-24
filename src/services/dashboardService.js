const { db } = require("../config/firebase");
const { getStudentByUid, normalizeUid } = require("./studentService");

function sortByNewestDate(items, key) {
  return [...items].sort((a, b) => {
    const aValue = a[key] || "";
    const bValue = b[key] || "";
    return bValue.localeCompare(aValue);
  });
}

async function getStudentDashboard(uid) {
  const normalizedUid = normalizeUid(uid);

  if (!normalizedUid) {
    throw new Error("Student UID is required.");
  }

  const student = await getStudentByUid(normalizedUid);

  if (!student) {
    return null;
  }

  const [attendanceDailySnapshot, attendanceLogsSnapshot] = await Promise.all([
    db.collection("attendance_daily").where("uid", "==", normalizedUid).get(),
    db.collection("attendance_logs").where("uid", "==", normalizedUid).get()
  ]);

  const records = sortByNewestDate(
    attendanceDailySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    })),
    "attendanceDate"
  );

  const logs = sortByNewestDate(
    attendanceLogsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    })),
    "scannedAt"
  );

  return {
    student,
    records,
    logs
  };
}

module.exports = {
  getStudentDashboard
};
