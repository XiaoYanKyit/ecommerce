import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { buttonClass, EmptyState, PageSpinner } from "./ui";
import { Link } from "react-router-dom";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}

export function AdminRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!user.is_staff) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20">
        <EmptyState
          title="Admins only"
          text="Your account doesn't have access to this area."
          action={<Link to="/" className={buttonClass("primary")}>Back to the store</Link>}
        />
      </div>
    );
  }
  return <Outlet />;
}
