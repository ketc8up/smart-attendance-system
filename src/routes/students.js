const express = require("express");
const {
  getStudentByUid,
  registerStudent,
  normalizeUid
} = require("../services/studentService");

const router = express.Router();

router.get("/:uid", async (req, res) => {
  try {
    const uid = normalizeUid(req.params.uid);
    const student = await getStudentByUid(uid);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found."
      });
    }

    return res.json({
      success: true,
      student
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const student = await registerStudent(req.body);

    return res.status(201).json({
      success: true,
      student
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
