import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LeaveProvider } from "./context/LeaveContext";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { EmployeeDashboard } from "./pages/EmployeeDashboard";
import { ApplyLeavePage } from "./pages/ApplyLeavePage";
import { MyLeavesPage } from "./pages/MyLeavesPage";
import { SubstituteRequestsPage } from "./pages/SubstituteRequestsPage";
import { AdminDashboard } from "./pages/AdminDashboard";
import { SuperiorDashboard } from "./pages/SuperiorDashboard";
import { UserManagementPage } from "./pages/UserManagementPage";
import { ConfigurationPage } from "./pages/ConfigurationPage";
import { EmployeeProfilePage } from "./pages/EmployeeProfilePage";
import { CalendarPage } from "./pages/CalendarPage";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";
import { getStoredUser, isTeamAdmin, isSuperiorAdmin } from "./services/auth";
import "./App.css";

// Redirects to /login if no user is stored in localStorage, or to /change-password if forced password change is active
const RequireAuth = ({ children }) => {
  const user = getStoredUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.must_change_password) return <Navigate to="/change-password" replace />;
  return children;
};

// Route guard for Change Password page
const RequireChangePasswordAuth = ({ children }) => {
  const user = getStoredUser();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Route guard for Team Admin Dashboard (allows team_admin and legacy admin)
const RequireTeamAdmin = ({ children }) => {
  const user = getStoredUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.must_change_password) return <Navigate to="/change-password" replace />;
  if (isSuperiorAdmin(user)) return <Navigate to="/superior" replace />;
  if (!isTeamAdmin(user)) return <Navigate to="/" replace />;
  return children;
};

// Route guard for Superior Admin Dashboard (allows superior_admin only)
const RequireSuperiorAdmin = ({ children }) => {
  const user = getStoredUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.must_change_password) return <Navigate to="/change-password" replace />;
  if (!isSuperiorAdmin(user)) {
    return isTeamAdmin(user) ? <Navigate to="/admin" replace /> : <Navigate to="/" replace />;
  }
  return children;
};

// Route guard to prevent Superior Admin from accessing operational employee pages
const RequireNonSuperior = ({ children }) => {
  const user = getStoredUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.must_change_password) return <Navigate to="/change-password" replace />;
  if (isSuperiorAdmin(user)) return <Navigate to="/superior" replace />;
  return children;
};

// Index route router: directs superior admin to /superior, others to standard dashboard
const DashboardIndex = () => {
  const user = getStoredUser();
  if (isSuperiorAdmin(user)) return <Navigate to="/superior" replace />;
  return <EmployeeDashboard />;
};

function App() {
  return (
    <LeaveProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Standalone Forced Change Password Route */}
          <Route
            path="/change-password"
            element={
              <RequireChangePasswordAuth>
                <ChangePasswordPage />
              </RequireChangePasswordAuth>
            }
          />

          {/* Authenticated Application Layout */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<DashboardIndex />} />
            <Route
              path="dashboard"
              element={
                <RequireNonSuperior>
                  <EmployeeDashboard />
                </RequireNonSuperior>
              }
            />
            <Route
              path="apply-leave"
              element={
                <RequireNonSuperior>
                  <ApplyLeavePage />
                </RequireNonSuperior>
              }
            />
            <Route
              path="my-leaves"
              element={
                <RequireNonSuperior>
                  <MyLeavesPage />
                </RequireNonSuperior>
              }
            />
            <Route
              path="substitute-requests"
              element={
                <RequireNonSuperior>
                  <SubstituteRequestsPage />
                </RequireNonSuperior>
              }
            />
            <Route
              path="admin"
              element={
                <RequireTeamAdmin>
                  <AdminDashboard />
                </RequireTeamAdmin>
              }
            />
            <Route
              path="superior"
              element={
                <RequireSuperiorAdmin>
                  <SuperiorDashboard />
                </RequireSuperiorAdmin>
              }
            />
            <Route
              path="superior/users"
              element={
                <RequireSuperiorAdmin>
                  <UserManagementPage />
                </RequireSuperiorAdmin>
              }
            />
            <Route
              path="superior/configuration"
              element={
                <RequireSuperiorAdmin>
                  <ConfigurationPage />
                </RequireSuperiorAdmin>
              }
            />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="profile" element={<EmployeeProfilePage />} />
          </Route>

          {/* Catch-all redirect to Index */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </LeaveProvider>
  );
}

export default App;
