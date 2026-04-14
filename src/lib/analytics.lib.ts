import { analyticsEnabled } from "config/posthog.config";
import { posthog } from "posthog-js";

export function setAnalyticsUser(user: { uid?: string; id?: string; email?: string | null }) {
  if (!analyticsEnabled) return;
  const id = user.uid ?? user.id ?? "";
  posthog.identify(id, { email: user.email });
}

export function clearAnalyticsUser() {
  if (!analyticsEnabled) return;

  posthog.reset();
}

export function sendPageViewEvent() {
  if (!analyticsEnabled) return;
  posthog.capture("$pageview");
}

export function reportApiError(
  errorMessage: string,
  underlyingErrorMessage?: string
) {
  if (!analyticsEnabled) return;
  posthog.capture("error-api", {
    message: errorMessage,
    underlyingErrorMessage,
  });
}

export function reportPageError(
  errorMessage: string,
  trace: string | undefined,
  pathname: string
) {
  if (!analyticsEnabled) return;

  posthog.capture("error-crash", {
    message: errorMessage,
    trace,
    pathname,
  });
}
