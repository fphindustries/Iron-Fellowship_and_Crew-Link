import { analyticsEnabled } from "config/posthog.config";
import type { UserProfile } from "@starforged/shared";
import { posthog } from "posthog-js";

export function setAnalyticsUser(user: UserProfile) {
  if (!analyticsEnabled) return;
  posthog.identify(user.id, { email: user.email });
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
