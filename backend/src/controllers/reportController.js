import pool from "../config/db.js";
import { reportDao } from "../dao/reportDao.js";
import { excelReportService } from "../services/excelReportService.js";
import { pdfReportService } from "../services/pdfReportService.js";

// Helper to verify caller is Superior Admin
const verifySuperiorAdmin = async (req) => {
  const callerId =
    req.query.superior_admin_id ||
    req.body?.superior_admin_id ||
    req.user?.id ||
    req.headers["x-user-id"];

  if (!callerId) {
    const err = new Error("Only authorized Superior Admins can perform this action.");
    err.statusCode = 403;
    throw err;
  }

  const userRes = await pool.query("SELECT id, name, role FROM users WHERE id = $1", [callerId]);
  if (userRes.rows.length === 0 || userRes.rows[0].role !== "superior_admin") {
    const err = new Error("Only authorized Superior Admins can perform this action.");
    err.statusCode = 403;
    throw err;
  }

  return userRes.rows[0];
};

// Helper to validate date range
const validateDateRange = (fromDate, toDate) => {
  if (!fromDate || !fromDate.trim()) {
    const err = new Error("From Date is required.");
    err.statusCode = 400;
    throw err;
  }
  if (!toDate || !toDate.trim()) {
    const err = new Error("To Date is required.");
    err.statusCode = 400;
    throw err;
  }

  const start = new Date(fromDate);
  const end = new Date(toDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    const err = new Error("Invalid date format. Please use YYYY-MM-DD.");
    err.statusCode = 400;
    throw err;
  }

  if (start > end) {
    const err = new Error("From Date cannot be after To Date.");
    err.statusCode = 400;
    throw err;
  }
};

export const reportController = {
  // GET /api/superior/reports/leave-summary
  async getLeaveSummaryReport(req, res) {
    try {
      const superiorUser = await verifySuperiorAdmin(req);
      const { from_date, to_date } = req.query;

      validateDateRange(from_date, to_date);

      const reportData = await reportDao.getLeaveSummaryReportData({
        fromDate: from_date.trim(),
        toDate: to_date.trim(),
        superiorAdminId: superiorUser.id,
      });

      return res.status(200).json({
        message: "Leave summary report generated successfully.",
        report: reportData,
      });
    } catch (err) {
      console.error("Error generating leave summary report:", err);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || "Failed to generate leave summary report.",
      });
    }
  },

  // GET /api/superior/reports/leave-summary/export/excel
  async exportLeaveSummaryExcel(req, res) {
    try {
      const superiorUser = await verifySuperiorAdmin(req);
      const { from_date, to_date } = req.query;

      validateDateRange(from_date, to_date);

      const reportData = await reportDao.getLeaveSummaryReportData({
        fromDate: from_date.trim(),
        toDate: to_date.trim(),
        superiorAdminId: superiorUser.id,
      });

      const workbook = await excelReportService.generateLeaveSummaryWorkbook(reportData);
      const filename = `leave-summary-report-${from_date.trim()}-to-${to_date.trim()}.xlsx`;

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      console.error("Error exporting leave summary Excel:", err);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || "Failed to export Excel report.",
      });
    }
  },

  // GET /api/superior/reports/leave-summary/export/pdf
  async exportLeaveSummaryPdf(req, res) {
    try {
      const superiorUser = await verifySuperiorAdmin(req);
      const { from_date, to_date } = req.query;

      validateDateRange(from_date, to_date);

      const reportData = await reportDao.getLeaveSummaryReportData({
        fromDate: from_date.trim(),
        toDate: to_date.trim(),
        superiorAdminId: superiorUser.id,
      });

      const pdfBuffer = await pdfReportService.generateLeaveSummaryPdf(reportData);
      const filename = `leave-summary-report-${from_date.trim()}-to-${to_date.trim()}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", pdfBuffer.length);

      res.send(pdfBuffer);
    } catch (err) {
      console.error("Error exporting leave summary PDF:", err);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || "Failed to export PDF report.",
      });
    }
  },
};
