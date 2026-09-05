import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { storeUser, clearStoredUser } from "../services/auth";
import App from "../App";

describe("Route Guards in App.jsx", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should redirect unauthenticated user to /login when attempting to access /", () => {
    clearStoredUser();
    window.history.pushState({}, "Test", "/");

    render(<App />);

    // Expect to land on LoginPage containing sign in prompt or inputs
    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
  });

  it("should redirect user with must_change_password = true to /change-password", () => {
    storeUser({
      id: "u-1",
      name: "New User",
      role: "employee",
      must_change_password: true,
    });
    window.history.pushState({}, "Test", "/dashboard");

    render(<App />);

    // Expect to land on ChangePasswordPage containing "Force Password Change" heading
    expect(screen.getByRole("heading", { name: /force password change/i })).toBeInTheDocument();
  });

  it("should block employee from accessing /superior and redirect to /", () => {
    storeUser({
      id: "u-2",
      name: "Standard Employee",
      role: "employee",
      must_change_password: false,
    });
    window.history.pushState({}, "Test", "/superior");

    render(<App />);

    // Should redirect away from /superior and show Employee Dashboard welcome header
    expect(screen.queryByText(/Superior Admin Dashboard/i)).not.toBeInTheDocument();
  });

  it("should allow superior_admin user to render /superior dashboard", () => {
    storeUser({
      id: "u-3",
      name: "Nadia Perera",
      role: "superior_admin",
      must_change_password: false,
    });
    window.history.pushState({}, "Test", "/superior");

    render(<App />);

    // Superior Admin Dashboard heading or metrics present
    expect(screen.getByRole("heading", { name: /superior admin dashboard/i })).toBeInTheDocument();
  });
});
