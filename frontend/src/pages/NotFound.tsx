import { Link } from "react-router-dom";
import { buttonClass, EmptyState } from "../components/ui";
import { useTitle } from "../hooks/useTitle";

export default function NotFound() {
  useTitle("Page not found");
  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <EmptyState
        title="Page not found"
        text="That page doesn't exist or has moved."
        action={<Link to="/" className={buttonClass("primary")}>Back to the store</Link>}
      />
    </div>
  );
}
