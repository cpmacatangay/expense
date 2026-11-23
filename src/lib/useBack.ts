import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Returns to the screen the user came from.
 *
 * A direct visit has no in-app history, so it falls back to the screen's
 * parent instead of leaving the app.
 */
export function useBack(fallback: string) {
  const location = useLocation();
  const navigate = useNavigate();

  return useCallback(() => {
    if (location.key !== "default") {
      navigate(-1);
      return;
    }
    navigate(fallback, { replace: true });
  }, [fallback, location.key, navigate]);
}
