import { supabase } from "config/supabase.config";
import { createApiFunction } from "api-calls/createApiFunction";

export const addNote = createApiFunction<
  {
    campaignId?: string;
    characterId?: string;
    order: number;
    shared?: boolean;
  },
  string
>(async (params) => {
  const { campaignId, characterId, order, shared } = params;

  if (!campaignId && !characterId) {
    throw new Error("Either character or campaign ID must be defined");
  }

  if (characterId) {
    const { data, error } = await supabase
      .from("character_notes")
      .insert({
        character_id: characterId,
        order,
        title: "New Page",
        shared: shared ?? false,
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  } else {
    const { data, error } = await supabase
      .from("campaign_notes")
      .insert({
        campaign_id: campaignId as string,
        order,
        title: "New Page",
        shared: shared ?? false,
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }
}, "Failed to add note.");
