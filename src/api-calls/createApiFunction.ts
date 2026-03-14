import { getErrorMessage } from "functions/getErrorMessage";
import { reportApiError } from "lib/analytics.lib";
import { createErrorSnackbar } from "providers/SnackbarProvider";

export type ApiFunction<Params, ReturnType> = (
  params: Params
) => Promise<ReturnType>;

/**
 * Use this as a catch handler when calling a function wrapped by createApiFunction.
 *
 * createApiFunction re-throws errors after handling them (logging to console,
 * reporting to analytics, and showing the user an error snackbar). This handler
 * consumes that re-thrown rejection to prevent "Unhandled promise rejection"
 * warnings without hiding the error — the user has already been notified.
 *
 * @example
 * updateCharacter({ name }).catch(ignoreApiError);
 * saveNote().then(() => navigate("/")).catch(ignoreApiError);
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const ignoreApiError = (_error?: unknown): void => undefined;

export function createApiFunction<Params, Result>(
  apiFunction: ApiFunction<Params, Result>,
  friendlyErrorMessage: string
): ApiFunction<Params, Result> {
  return (params: Params) =>
    new Promise((resolve, reject) => {
      apiFunction(params)
        .then(resolve)
        .catch((e) => {
          console.error(e);
          const apiErrorMessage = getErrorMessage(e, friendlyErrorMessage);
          reportApiError(friendlyErrorMessage, apiErrorMessage);
          createErrorSnackbar(friendlyErrorMessage);
          reject(e);
        });
    });
}
