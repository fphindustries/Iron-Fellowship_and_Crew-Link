import { PropsWithChildren } from "react";
import { ThemeProvider } from "./ThemeProvider";
import { SnackbarProvider } from "./SnackbarProvider";
import { ConfirmProvider } from "material-ui-confirm";
import { AnalyticsProvider } from "./AnalyticsProvider";
import { QueryProvider } from "./QueryProvider";

export function AppProviders(props: PropsWithChildren) {
  const { children } = props;
  return (
    <QueryProvider>
      <AnalyticsProvider>
        <ThemeProvider>
          <ConfirmProvider
            defaultOptions={{ cancellationButtonProps: { color: "inherit" } }}
          >
            <SnackbarProvider>
              <>{children}</>
            </SnackbarProvider>
          </ConfirmProvider>
        </ThemeProvider>
      </AnalyticsProvider>
    </QueryProvider>
  );
}
