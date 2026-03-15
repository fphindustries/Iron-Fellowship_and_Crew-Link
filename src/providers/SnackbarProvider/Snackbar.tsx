import { Ref } from "react";
import { CustomContentProps } from "notistack";
import { Alert } from "@mui/material";
import { closeSnackbar } from "notistack";

export function Snackbar({
  ref,
  message,
  variant,
  action,
  id,
  style,
}: CustomContentProps & { ref?: Ref<HTMLDivElement> }) {
  return (
    <Alert
      key={id}
      style={style}
      ref={ref}
      severity={variant === "default" ? "info" : variant}
      variant={"filled"}
      action={typeof action === "function" ? action(id) : action}
      onClose={() => closeSnackbar(id)}
    >
      {message}
    </Alert>
  );
}
