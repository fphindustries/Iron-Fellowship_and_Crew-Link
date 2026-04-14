import { supabase } from "config/supabase.config";
import { createApiFunction } from "api-calls/createApiFunction";
import { CHARACTER_TABLE } from "api-calls/character/_getRef";
import { CAMPAIGN_TABLE } from "api-calls/campaign/_getRef";
import { HOMEBREW_COLLECTION_TABLE } from "./_getRef";

export const deleteHomebrewExpansion = createApiFunction<{ id: string }, void>(
  async (params) => {
    const { id } = params;

    // Fetch characters and campaigns that reference this expansion
    const [{ data: characters }, { data: campaigns }] = await Promise.all([
      supabase
        .from(CHARACTER_TABLE)
        .select("id, expansion_ids")
        .contains("expansion_ids", [id]),
      supabase
        .from(CAMPAIGN_TABLE)
        .select("id, expansion_ids")
        .contains("expansion_ids", [id]),
    ]);

    const updatePromises: PromiseLike<unknown>[] = [];

    (characters ?? []).forEach((character) => {
      const updatedIds = ((character.expansion_ids as string[]) ?? []).filter(
        (eid: string) => eid !== id
      );
      updatePromises.push(
        supabase
          .from(CHARACTER_TABLE)
          .update({ expansion_ids: updatedIds })
          .eq("id", character.id)
          .then(({ error }) => {
            if (error) throw error;
          })
      );
    });

    (campaigns ?? []).forEach((campaign) => {
      const updatedIds = ((campaign.expansion_ids as string[]) ?? []).filter(
        (eid: string) => eid !== id
      );
      updatePromises.push(
        supabase
          .from(CAMPAIGN_TABLE)
          .update({ expansion_ids: updatedIds } as any)
          .eq("id", campaign.id)
          .then(({ error }) => {
            if (error) throw error;
          })
      );
    });

    await Promise.all(updatePromises);

    const { error } = await supabase
      .from(HOMEBREW_COLLECTION_TABLE)
      .delete()
      .eq("id", id);

    if (error) throw error;
  },
  "Failed to delete expansion."
);
