const express = require("express");
const { getStudentDashboard } = require("../services/dashboardService");
const { normalizeUid } = require("../services/studentService");

const router = express.Router();

router.get("/:uid", async (req, res) => {
  try {
    const uid = normalizeUid(req.params.uid);
    const dashboard = await getStudentDashboard(uid);

    if (!dashboard) {
      return res.status(404).json({
        success: false,
        message: "Student not found."
      });
    }

    return res.json({
      success: true,
      ...dashboard
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
