import { supabase } from "config/supabase.config";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { UserAccessibilitySettingsRow } from "lib/database.types";
import { AccessibilitySettingsDocument } from "api-calls/user/settings/_settings.type";

export const listenToAccessibilitySettings = (
  uid: string,
  onSettings: (settings: AccessibilitySettingsDocument) => void
): () => void => {
  const channel = supabase
    .channel(`user_accessibility_settings:${uid}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "user_accessibility_settings",
        filter: `user_id=eq.${uid}`,
      },
      (
        payload: RealtimePostgresChangesPayload<UserAccessibilitySettingsRow>
      ) => {
        if (payload.eventType === "DELETE") {
          onSettings({});
          return;
        }
        const row = payload.new as UserAccessibilitySettingsRow;
        onSettings((row.settings as AccessibilitySettingsDocument) ?? {});
      }
    )
    .subscribe();

  Promise.resolve(
    supabase
      .from("user_accessibility_settings")
      .select("settings")
      .eq("user_id", uid)
      .single()
  ).then(({ data }) => {
    onSettings(
      ((data as UserAccessibilitySettingsRow | null)
        ?.settings as AccessibilitySettingsDocument) ?? {}
    );
  });

  return () => {
    supabase.removeChannel(channel);
  };
};
