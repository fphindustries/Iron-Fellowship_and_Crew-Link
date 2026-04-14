import { supabase } from "config/supabase.config";
import { UserDocument } from "api-calls/user/_user.type";
import { UserRow } from "lib/database.types";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

function rowToUserDoc(row: UserRow): UserDocument {
  return {
    displayName: row.display_name,
    photoURL: row.photo_url ?? undefined,
  };
}

export const listenToUserDoc = (
  uid: string,
  onUser: (user: UserDocument) => void
): () => void => {
  const channel = supabase
    .channel(`users:${uid}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "users", filter: `id=eq.${uid}` },
      (payload: RealtimePostgresChangesPayload<UserRow>) => {
        if (payload.eventType === "DELETE") return;
        onUser(rowToUserDoc(payload.new as UserRow));
      }
    )
    .subscribe();

  Promise.resolve(
    supabase.from("users").select("*").eq("id", uid).single()
  ).then(({ data }) => {
    if (data) {
      onUser(rowToUserDoc(data));
    }
  });

  return () => {
    supabase.removeChannel(channel);
  };
};
