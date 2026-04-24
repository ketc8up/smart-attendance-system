const express = require("express");
const { verifyAndMarkAttendance } = require("../services/attendanceService");

const router = express.Router();

router.post("/scan", async (req, res) => {
  try {
    const result = await verifyAndMarkAttendance(req.body);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
