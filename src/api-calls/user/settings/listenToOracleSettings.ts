import { supabase } from "config/supabase.config";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { UserOracleSettingsRow } from "lib/database.types";
import { decodeDataswornId } from "functions/dataswornIdEncoder";
import { OracleSettingsDocument } from "api-calls/user/settings/_settings.type";

function decodeOracleSettings(
  raw: OracleSettingsDocument
): OracleSettingsDocument {
  const { pinnedOracleSections } = raw;
  if (!pinnedOracleSections) return raw;

  const decoded: { [key: string]: boolean } = {};
  Object.keys(pinnedOracleSections).forEach((pinnedId) => {
    decoded[decodeDataswornId(pinnedId)] = pinnedOracleSections[pinnedId];
  });
  return { pinnedOracleSections: decoded };
}

export function listenToOracleSettings(
  uid: string,
  onOracleSettings: (settings: OracleSettingsDocument) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onError: (error: any) => void
): () => void {
  const channel = supabase
    .channel(`user_oracle_settings:${uid}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "user_oracle_settings",
        filter: `user_id=eq.${uid}`,
      },
      (payload: RealtimePostgresChangesPayload<UserOracleSettingsRow>) => {
        if (payload.eventType === "DELETE") {
          onOracleSettings({});
          return;
        }
        const row = payload.new as UserOracleSettingsRow;
        onOracleSettings(
          decodeOracleSettings((row.settings as OracleSettingsDocument) ?? {})
        );
      }
    )
    .subscribe();

  Promise.resolve(
    supabase
      .from("user_oracle_settings")
      .select("settings")
      .eq("user_id", uid)
      .single()
  )
    .then(({ data, error }: { data: unknown; error: unknown }) => {
      if (error || !data) {
        // Initialize with empty settings if none found
        return Promise.resolve(
          supabase
            .from("user_oracle_settings")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .upsert({ user_id: uid, settings: { pinnedOracleSections: {} } } as any)
        ).then(({ error: upsertError }: { error: unknown }) => {
          if (upsertError) {
            console.error(upsertError);
            onError(upsertError);
          } else {
            onOracleSettings({});
          }
        });
      } else {
        onOracleSettings(
          decodeOracleSettings(
            ((data as UserOracleSettingsRow).settings as OracleSettingsDocument) ?? {}
          )
        );
      }
    })
    .catch((e: unknown) => {
      console.error(e);
      onError(e);
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
