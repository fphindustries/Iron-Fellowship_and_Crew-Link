import { useEffect } from "react";
import { useStore } from "stores/store";
import { useHomebrewQuery } from "hooks/queries/useHomebrewQuery";
import { PackageTypes } from "types/homebrew/HomebrewCollection.type";

export function useListenToHomebrew() {
  const uid = useStore((store) => store.auth.user?.id);
  const { data: collections } = useHomebrewQuery(uid);

  useEffect(() => {
    if (!collections || !uid) return;
    useStore.setState((store) => {
      collections.forEach((row) => {
        store.homebrew.collections[row.id] = {
          ...(store.homebrew.collections[row.id] ?? {}),
          base: {
            type: PackageTypes.Expansion,
            id: row.id,
            title: row.name ?? row.title ?? "",
            description: row.description,
            editors: row.editors ?? [],
            viewers: row.viewers ?? [],
            creator: row.creator,
            rulesetId: row.rulesetId ?? "",
          },
        };
      });
      store.homebrew.sortedHomebrewCollectionIds = collections
        .filter(
          (row) =>
            row.editors?.includes(uid) ||
            row.viewers?.includes(uid) ||
            row.creator === uid
        )
        .sort((a, b) => ((a.name ?? "") as string).localeCompare((b.name ?? "") as string))
        .map((row) => row.id);
      store.homebrew.loading = false;
    });
  }, [collections, uid]);
}
