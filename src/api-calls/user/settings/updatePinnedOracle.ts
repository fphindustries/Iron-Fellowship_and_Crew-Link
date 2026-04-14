import { supabase } from "config/supabase.config";
import { encodeDataswornId } from "functions/dataswornIdEncoder";
import { UserOracleSettingsRow } from "lib/database.types";
import { OracleSettingsDocument } from "api-calls/user/settings/_settings.type";
import { createApiFunction } from "api-calls/createApiFunction";

export const updatePinnedOracle = createApiFunction<
  { uid: string; oracleId: string; pinned: boolean },
  void
>((params) => {
  const { uid, oracleId, pinned } = params;

  return new Promise((resolve, reject) => {
    const encodedId = encodeDataswornId(oracleId);

    // Fetch current settings, merge the pinned oracle change, then upsert
    Promise.resolve(
      supabase
        .from("user_oracle_settings")
        .select("settings")
        .eq("user_id", uid)
        .single()
    )
      .then(({ data }: { data: unknown }) => {
        const current = ((data as UserOracleSettingsRow | null)
          ?.settings as OracleSettingsDocument) ?? {};
        const updatedSettings: OracleSettingsDocument = {
          ...current,
          pinnedOracleSections: {
            ...(current.pinnedOracleSections ?? {}),
            [encodedId]: pinned,
          },
        };

        return Promise.resolve(
          supabase
            .from("user_oracle_settings")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .upsert({ user_id: uid, settings: updatedSettings } as any)
        );
      })
      .then(({ error }: { error: unknown }) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      })
      .catch((e: unknown) => reject(e));
  });
}, "Failed to pin oracle.");
