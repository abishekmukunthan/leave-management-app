import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LeaveProvider } from "./context/LeaveContext";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { EmployeeDashboard } from "./pages/EmployeeDashboard";
import { ApplyLeavePage } from "./pages/ApplyLeavePage";
import { MyLeavesPage } from "./pages/MyLeavesPage";
import { SubstituteRequestsPage } from "./pages/SubstituteRequestsPage";
import { AdminDashboard } from "./pages/AdminDashboard";
import { EmployeeProfilePage } from "./pages/EmployeeProfilePage";
import { getStoredUser, isAdmin } from "./services/auth";
import "./App.css";

// Redirects to /login if no user is stored in localStorage
const RequireAuth = ({ children }) => {
  const user = getStoredUser();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Redirects to / if the logged-in user is not an admin
const RequireAdmin = ({ children }) => {
  const user = getStoredUser();
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin(user)) return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <LeaveProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Authenticated Application Layout */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<EmployeeDashboard />} />
            <Route path="dashboard" element={<EmployeeDashboard />} />
            <Route path="apply-leave" element={<ApplyLeavePage />} />
            <Route path="my-leaves" element={<MyLeavesPage />} />
            <Route path="substitute-requests" element={<SubstituteRequestsPage />} />
            <Route
              path="admin"
              element={
                <RequireAdmin>
                  <AdminDashboard />
                </RequireAdmin>
              }
            />
            <Route path="profile" element={<EmployeeProfilePage />} />
          </Route>

          {/* Catch-all redirect to Dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </LeaveProvider>
  );
}

export default App;
