import { supabase } from "config/supabase.config";
import { ApiFunction } from "api-calls/createApiFunction";
import { AccessibilitySettingsDocument } from "api-calls/user/settings/_settings.type";

export const updateAccessibilitySettings: ApiFunction<
  { uid: string; settings: Partial<AccessibilitySettingsDocument> },
  void
> = (params) => {
  const { uid, settings } = params;
  return Promise.resolve(
    supabase
      .from("user_accessibility_settings")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert({ user_id: uid, settings } as any)
  ).then(({ error }: { error: unknown }) => {
    if (error) throw error;
  });
};
