const { db } = require("../config/firebase");

function normalizeUid(uid = "") {
  return uid.trim().toUpperCase().replace(/\s+/g, "");
}

async function getStudentByUid(uid) {
  const normalizedUid = normalizeUid(uid);

  if (!normalizedUid) {
    return null;
  }

  const doc = await db.collection("students").doc(normalizedUid).get();

  if (!doc.exists) {
    return null;
  }

  return {
    id: doc.id,
    ...doc.data()
  };
}

async function registerStudent(student) {
  const uid = normalizeUid(student.uid);

  if (!uid) {
    throw new Error("Student UID is required.");
  }

  const studentRecord = {
    uid,
    name: student.name || "Unknown Student",
    rollNo: student.rollNo || "",
    department: student.department || "",
    year: student.year || "",
    active: student.active !== false,
    createdAt: new Date().toISOString()
  };

  await db.collection("students").doc(uid).set(studentRecord, { merge: true });

  return studentRecord;
}

module.exports = {
  getStudentByUid,
  normalizeUid,
  registerStudent
};
