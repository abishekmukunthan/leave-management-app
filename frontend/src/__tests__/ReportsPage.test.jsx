import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReportsPage } from "../pages/ReportsPage";
import { LeaveProvider } from "../context/LeaveContext";
import * as api from "../services/api";
import * as auth from "../services/auth";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual("../services/api");
  return {
    ...actual,
    getLeaveSummaryReport: vi.fn(),
    downloadLeaveSummaryExcel: vi.fn(),
    downloadLeaveSummaryPdf: vi.fn(),
  };
});

describe("Superior Admin ReportsPage Component", () => {
  const mockSuperiorAdmin = {
    id: "sup-nadia",
    name: "Nadia Perera",
    role: "superior_admin",
  };

  const mockReportData = {
    metadata: {
      report_title: "Leave Summary Report",
      from_date: "2026-09-01",
      to_date: "2026-09-15",
      generated_at: "2026-09-09T10:00:00.000Z",
      generated_by: "Nadia Perera",
    },
    summary: {
      total_requests: 3,
      total_employees_took_leave: 2,
      total_leave_days: 5.5,
      total_time_permission_hours: 2,
      approved_requests: 2,
      pending_requests: 1,
      rejected_requests: 0,
      paycut_leave_count: 1,
    },
    details: [
      {
        id: "leave-1",
        employee_id: "emp-1",
        employee_name: "Alice Smith",
        department_name: "Engineering",
        team_name: "Engineering",
        leave_type: "Annual Leave",
        record_type: "Leave",
        start_date: "2026-09-02",
        end_date: "2026-09-05",
        leave_days: 4,
        permission_hours: 0,
        substitute_name: "Bob Lee",
        assigned_work: "Project review",
        status: "Approved",
        approved_by: "Priya Fernando",
        applied_date: "2026-09-01",
        remarks: "Annual vacation",
        is_paycut_leave: false,
        paycut_units: 0,
      },
      {
        id: "leave-2",
        employee_id: "emp-2",
        employee_name: "Charlie Brown",
        department_name: "Support",
        team_name: "Support",
        leave_type: "Time Permission",
        record_type: "Time Permission",
        start_date: "2026-09-06",
        end_date: "—",
        leave_days: 0,
        permission_hours: 2,
        substitute_name: "Not assigned",
        assigned_work: "No assigned work",
        status: "Approved",
        approved_by: "Alex Morgan",
        applied_date: "2026-09-03",
        remarks: "Dentist appointment",
        is_paycut_leave: false,
        paycut_units: 0,
      },
      {
        id: "leave-3",
        employee_id: "emp-1",
        employee_name: "Alice Smith",
        department_name: "Engineering",
        team_name: "Engineering",
        leave_type: "Casual Leave",
        record_type: "Leave",
        start_date: "2026-09-10",
        end_date: "2026-09-11",
        leave_days: 1.5,
        permission_hours: 0,
        substitute_name: "Bob Lee",
        assigned_work: "Client ticket handover",
        status: "Waiting for Admin Approval",
        approved_by: "—",
        applied_date: "2026-09-08",
        remarks: "Personal matters",
        is_paycut_leave: true,
        paycut_units: 1.5,
      },
    ],
    employee_summary: [
      {
        employee_id: "emp-1",
        employee_name: "Alice Smith",
        department_name: "Engineering",
        total_requests: 2,
        total_leave_days: 5.5,
        total_permission_hours: 0,
        approved_count: 1,
        pending_count: 1,
        rejected_count: 0,
        paycut_count: 1,
      },
      {
        employee_id: "emp-2",
        employee_name: "Charlie Brown",
        department_name: "Support",
        total_requests: 1,
        total_leave_days: 0,
        total_permission_hours: 2,
        approved_count: 1,
        pending_count: 0,
        rejected_count: 0,
        paycut_count: 0,
      },
    ],
    team_summary: [
      {
        team_name: "Engineering",
        employees_count: 1,
        total_requests: 2,
        total_leave_days: 5.5,
        total_permission_hours: 0,
        most_used_leave_type: "Annual Leave",
      },
      {
        team_name: "Support",
        employees_count: 1,
        total_requests: 1,
        total_leave_days: 0,
        total_permission_hours: 2,
        most_used_leave_type: "Time Permission",
      },
    ],
    leave_type_breakdown: [
      { leave_type: "Annual Leave", count: 1, total_days: 4, total_hours: 0 },
      { leave_type: "Casual Leave", count: 1, total_days: 1.5, total_hours: 0 },
      { leave_type: "Time Permission", count: 1, total_days: 0, total_hours: 2 },
    ],
    exceptions: {
      paycut_leaves: [
        {
          id: "leave-3",
          employee_name: "Alice Smith",
          department_name: "Engineering",
          leave_type: "Casual Leave",
          start_date: "2026-09-10",
          paycut_units: 1.5,
          status: "Waiting for Admin Approval",
        },
      ],
      pending_leaves: [],
      rejected_leaves: [],
      high_usage_employees: [],
    },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(auth, "getStoredUser").mockReturnValue(mockSuperiorAdmin);
    vi.spyOn(auth, "isSuperiorAdmin").mockReturnValue(true);

    api.getLeaveSummaryReport.mockResolvedValue({
      message: "Leave summary report generated successfully.",
      report: mockReportData,
    });
    api.downloadLeaveSummaryExcel.mockResolvedValue({ success: true, filename: "report.xlsx" });
    api.downloadLeaveSummaryPdf.mockResolvedValue({ success: true, filename: "report.pdf" });
  });

  it("should render date range filter and generate report on submit", async () => {
    render(
      <LeaveProvider>
        <ReportsPage />
      </LeaveProvider>
    );

    expect(screen.getByRole("heading", { name: /reports & analytics/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/from date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/to date/i)).toBeInTheDocument();

    const generateBtn = screen.getByRole("button", { name: /generate report/i });
    expect(generateBtn).toBeInTheDocument();

    // Set Date Range
    fireEvent.change(screen.getByLabelText(/from date/i), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText(/to date/i), { target: { value: "2026-09-15" } });

    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(api.getLeaveSummaryReport).toHaveBeenCalledWith("2026-09-01", "2026-09-15", "sup-nadia");
    });

    // Check KPI metrics and rendered content
    await waitFor(() => {
      expect(screen.getByText("Total Requests")).toBeInTheDocument();
      expect(screen.getByText("5.5")).toBeInTheDocument(); // total leave days
      expect(screen.getAllByText("2 hrs").length).toBeGreaterThan(0); // permission hours
      expect(screen.getAllByText("Alice Smith").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Charlie Brown").length).toBeGreaterThan(0);
    });
  });

  it("should disable download buttons when date range is invalid", () => {
    render(
      <LeaveProvider>
        <ReportsPage />
      </LeaveProvider>
    );

    // Invert dates
    fireEvent.change(screen.getByLabelText(/from date/i), { target: { value: "2026-09-20" } });
    fireEvent.change(screen.getByLabelText(/to date/i), { target: { value: "2026-09-10" } });

    const excelBtn = screen.getByRole("button", { name: /download excel/i });
    const pdfBtn = screen.getByRole("button", { name: /download pdf/i });

    expect(excelBtn).toBeDisabled();
    expect(pdfBtn).toBeDisabled();
  });

  it("should call download APIs when clicking Download Excel and Download PDF", async () => {
    render(
      <LeaveProvider>
        <ReportsPage />
      </LeaveProvider>
    );

    fireEvent.change(screen.getByLabelText(/from date/i), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText(/to date/i), { target: { value: "2026-09-15" } });

    // Download Excel
    const excelBtn = screen.getByRole("button", { name: /download excel/i });
    expect(excelBtn).not.toBeDisabled();
    fireEvent.click(excelBtn);

    await waitFor(() => {
      expect(api.downloadLeaveSummaryExcel).toHaveBeenCalledWith("2026-09-01", "2026-09-15", "sup-nadia");
    });

    // Download PDF
    const pdfBtn = screen.getByRole("button", { name: /download pdf/i });
    expect(pdfBtn).not.toBeDisabled();
    fireEvent.click(pdfBtn);

    await waitFor(() => {
      expect(api.downloadLeaveSummaryPdf).toHaveBeenCalledWith("2026-09-01", "2026-09-15", "sup-nadia");
    });
  });
});
