import { CreateSliceType } from "stores/store.type";
import { LocationTab, LocationsSlice } from "./locations.slice.type";
import { defaultLocationsSlice } from "./locations.slice.default";
import { api } from "config/api.config";
import { uploadImage, deleteImage, getImageUrl } from "lib/storage.lib";
import { Location } from "types/Locations.type";
import { MapEntryType } from "types/Locations.type";

function constructLocationImagePath(worldId: string, locationId: string) {
  return `/worlds/${worldId}/locations/${locationId}`;
}

function toLocation(row: any): Location {
  return {
    name: row.name,
    imageFilenames: row.imageFilenames ?? [],
    updatedDate: row.updatedAt ? new Date(row.updatedAt) : new Date(),
    createdDate: row.createdAt ? new Date(row.createdAt) : new Date(),
    ...(row.dataJson ?? {}),
  };
}

export const createLocationsSlice: CreateSliceType<LocationsSlice> = (
  set,
  getState
) => ({
  ...defaultLocationsSlice,

  subscribe: (worldId: string) => {
    let active = true;

    api
      .get<any[]>(`/api/worlds/${worldId}/locations`)
      .then((rows) => {
        if (!active) return;
        set((store) => {
          store.worlds.currentWorld.currentWorldLocations.loading = false;
          rows.forEach((row) => {
            const location = toLocation(row);
            const existing =
              store.worlds.currentWorld.currentWorldLocations.locationMap[row.id];
            if ((location.imageFilenames?.length ?? 0) > 0) {
              store.worlds.currentWorld.doAnyDocsHaveImages = true;
            }
            store.worlds.currentWorld.currentWorldLocations.locationMap[row.id] = {
              ...location,
              gmProperties: existing?.gmProperties,
              notes: existing?.notes,
              imageUrl: (location.imageFilenames?.length ?? 0) > 0 ? existing?.imageUrl : undefined,
              mapBackgroundImageUrl: location.mapBackgroundImageFilename
                ? existing?.mapBackgroundImageUrl
                : undefined,
            };
          });
        });
      })
      .catch((error) => {
        if (!active) return;
        set((store) => {
          store.worlds.currentWorld.currentWorldLocations.error = String(error);
        });
      });

    return () => {
      active = false;
    };
  },

  setOpenLocationId: (locationId) => {
    set((store) => {
      store.worlds.currentWorld.currentWorldLocations.openLocationId = locationId;
      store.worlds.currentWorld.currentWorldLocations.openTab = LocationTab.Notes;
    });
  },
  closeLocation: () => {
    set((store) => {
      const currentLocationId =
        store.worlds.currentWorld.currentWorldLocations.openLocationId;
      if (currentLocationId) {
        const parentLocationId =
          store.worlds.currentWorld.currentWorldLocations.locationMap[
            currentLocationId
          ]?.parentLocationId;
        store.worlds.currentWorld.currentWorldLocations.openLocationId =
          parentLocationId ?? undefined;
      } else {
        store.worlds.currentWorld.currentWorldLocations.openLocationId = undefined;
      }
    });
  },
  setLocationTab: (tab) => {
    set((store) => {
      store.worlds.currentWorld.currentWorldLocations.openTab = tab;
    });
  },
  setLocationSearch: (search) => {
    set((store) => {
      store.worlds.currentWorld.currentWorldLocations.locationSearch = search;
    });
  },

  createLocation: async () => {
    const worldId = getState().worlds.currentWorld.currentWorldId;
    if (!worldId) return Promise.reject("No world found");
    const row = await api.post<any>(`/api/worlds/${worldId}/locations`, {
      name: "New Location",
      dataJson: {},
    });
    const location = toLocation(row);
    set((store) => {
      store.worlds.currentWorld.currentWorldLocations.locationMap[row.id] = {
        ...location,
        gmProperties: undefined,
        notes: undefined,
      };
    });
    return row.id;
  },

  createSpecificLocation: async (location) => {
    const worldId = getState().worlds.currentWorld.currentWorldId;
    if (!worldId) return Promise.reject("No world found");
    const { name, imageFilenames, updatedDate: _u, createdDate: _c, ...dataJson } = location;
    const row = await api.post<any>(`/api/worlds/${worldId}/locations`, {
      name: name || "New Location",
      imageFilenames: imageFilenames ?? [],
      dataJson,
    });
    const loc = toLocation(row);
    set((store) => {
      store.worlds.currentWorld.currentWorldLocations.locationMap[row.id] = {
        ...loc,
        gmProperties: undefined,
        notes: undefined,
      };
    });
    return row.id;
  },

  deleteLocation: async (locationId) => {
    const world = getState().worlds.currentWorld;
    const worldId = world.currentWorldId;
    if (!worldId) return Promise.reject("No world found");
    const filename =
      world.currentWorldLocations.locationMap[locationId]?.imageFilenames?.[0];
    if (filename) {
      await deleteImage(constructLocationImagePath(worldId, locationId), filename).catch(() => {});
    }
    await api.del(`/api/worlds/${worldId}/locations/${locationId}`);
    set((store) => {
      delete store.worlds.currentWorld.currentWorldLocations.locationMap[locationId];
    });
  },

  updateLocation: async (locationId, partialLocation) => {
    const worldId = getState().worlds.currentWorld.currentWorldId;
    if (!worldId) return Promise.reject("No world found");
    const existingLoc = getState().worlds.currentWorld.currentWorldLocations.locationMap[locationId];
    const { name: _en, imageFilenames: _ei, gmProperties: _eg, notes: _eno, imageUrl: _eiu, mapBackgroundImageUrl: _embu, updatedDate: _eud, createdDate: _ecd, ...existingData } = (existingLoc ?? {}) as any;
    const { name, imageFilenames, gmProperties: _gm, notes: _no, imageUrl: _iu, mapBackgroundImageUrl: _mbu, updatedDate: _ud, createdDate: _cd, ...restData } = partialLocation as any;
    const patch: any = { dataJson: { ...existingData, ...restData } };
    if (name !== undefined) patch.name = name;
    if (imageFilenames !== undefined) patch.imageFilenames = imageFilenames;
    const row = await api.patch<any>(
      `/api/worlds/${worldId}/locations/${locationId}`,
      patch
    );
    const updated = toLocation(row);
    set((store) => {
      const existing =
        store.worlds.currentWorld.currentWorldLocations.locationMap[locationId];
      if (existing) {
        store.worlds.currentWorld.currentWorldLocations.locationMap[locationId] = {
          ...existing,
          ...updated,
        };
      }
    });
  },

  moveLocation: async (locationId, location, parentId, row, col) => {
    const worldId = getState().worlds.currentWorld.currentWorldId;
    if (!worldId) return Promise.reject("No world found");
    const updateLocation = getState().worlds.currentWorld.currentWorldLocations.updateLocation;

    // Remove from old parent map
    const oldParentId = location.parentLocationId;
    if (oldParentId) {
      const parentLocation =
        getState().worlds.currentWorld.currentWorldLocations.locationMap[oldParentId];
      if (parentLocation?.map) {
        const newMap = JSON.parse(JSON.stringify(parentLocation.map));
        for (const r of Object.keys(newMap)) {
          for (const c of Object.keys(newMap[r])) {
            const entry = newMap[r][c];
            if (entry?.type === MapEntryType.Location && entry.locationIds?.includes(locationId)) {
              entry.locationIds = entry.locationIds.filter((id: string) => id !== locationId);
            }
          }
        }
        updateLocation(oldParentId, { map: newMap } as any).catch(() => {});
      }
    }

    // Update the location with new parent
    updateLocation(locationId, { parentLocationId: parentId ?? null } as any).catch(() => {});

    // Add to new parent map
    if (typeof row === "number" && typeof col === "number" && parentId) {
      const parentLoc =
        getState().worlds.currentWorld.currentWorldLocations.locationMap[parentId];
      const newMap = JSON.parse(JSON.stringify(parentLoc?.map ?? {}));
      if (!newMap[row]) newMap[row] = {};
      if (!newMap[row][col]) newMap[row][col] = { type: MapEntryType.Location, locationIds: [] };
      if (!newMap[row][col].locationIds) newMap[row][col].locationIds = [];
      if (!newMap[row][col].locationIds.includes(locationId)) {
        newMap[row][col].locationIds.push(locationId);
      }
      newMap[row][col].type = MapEntryType.Location;
      return updateLocation(parentId, { map: newMap } as any);
    }
    return Promise.resolve();
  },

  updateLocationGMNotes: async (locationId, notes) => {
    const worldId = getState().worlds.currentWorld.currentWorldId;
    if (!worldId) return;
    await api.patch(`/api/worlds/${worldId}/locations/${locationId}/private-notes`, {
      content: Array.from(notes),
    });
  },

  updateLocationGMProperties: async (locationId, gmProperties) => {
    const worldId = getState().worlds.currentWorld.currentWorldId;
    if (!worldId) return;
    const { gmNotes: _gmNotes, ...dataJson } = gmProperties as any;
    await api.patch(`/api/worlds/${worldId}/locations/${locationId}/private-notes`, {
      dataJson,
    });
    set((store) => {
      const loc = store.worlds.currentWorld.currentWorldLocations.locationMap[locationId];
      if (loc) {
        loc.gmProperties = { ...(loc.gmProperties ?? {}), ...gmProperties };
      }
    });
  },

  updateLocationNotes: async (locationId, notes) => {
    const worldId = getState().worlds.currentWorld.currentWorldId;
    if (!worldId) return;
    await api.patch(`/api/worlds/${worldId}/locations/${locationId}/notes`, {
      content: Array.from(notes),
    });
  },

  updateLocationCharacterBond: async (locationId, characterId, bonded) => {
    const worldId = getState().worlds.currentWorld.currentWorldId;
    if (!worldId) return;
    const loc = getState().worlds.currentWorld.currentWorldLocations.locationMap[locationId];
    const characterBonds = { ...(loc?.characterBonds ?? {}), [characterId]: bonded };
    await api.patch(`/api/worlds/${worldId}/locations/${locationId}`, {
      dataJson: { ...((loc as any)?.dataJson ?? {}), characterBonds },
    });
    set((store) => {
      const existing = store.worlds.currentWorld.currentWorldLocations.locationMap[locationId];
      if (existing) {
        existing.characterBonds = characterBonds;
      }
    });
  },

  uploadLocationImage: async (locationId, image) => {
    const world = getState().worlds.currentWorld;
    const worldId = world.currentWorldId;
    if (!worldId) return Promise.reject("No world found");
    const oldFilename =
      world.currentWorldLocations.locationMap[locationId]?.imageFilenames?.[0];
    if (oldFilename) {
      await deleteImage(constructLocationImagePath(worldId, locationId), oldFilename).catch(() => {});
    }
    const imagePath = constructLocationImagePath(worldId, locationId);
    await uploadImage(imagePath, image);
    const imageFilenames = [image.name];
    await api.patch(`/api/worlds/${worldId}/locations/${locationId}`, { imageFilenames });
    const imageUrl = await getImageUrl(`${imagePath}/${image.name}`);
    set((store) => {
      const loc = store.worlds.currentWorld.currentWorldLocations.locationMap[locationId];
      if (loc) {
        loc.imageFilenames = imageFilenames;
        loc.imageUrl = imageUrl;
        store.worlds.currentWorld.doAnyDocsHaveImages = true;
      }
    });
  },

  uploadLocationMapBackground: async (locationId, image) => {
    const world = getState().worlds.currentWorld;
    const worldId = world.currentWorldId;
    if (!worldId) return Promise.reject("No world found");
    const oldFilename =
      world.currentWorldLocations.locationMap[locationId]?.mapBackgroundImageFilename;
    const imagePath = constructLocationImagePath(worldId, locationId);
    if (oldFilename) {
      await deleteImage(imagePath, oldFilename).catch(() => {});
    }
    await uploadImage(imagePath, image);
    const mapBackgroundImageFilename = image.name;
    const loc = getState().worlds.currentWorld.currentWorldLocations.locationMap[locationId];
    await api.patch(`/api/worlds/${worldId}/locations/${locationId}`, {
      dataJson: { ...((loc as any)?.dataJson ?? {}), mapBackgroundImageFilename },
    });
    const mapBackgroundImageUrl = await getImageUrl(`${imagePath}/${image.name}`);
    set((store) => {
      const l = store.worlds.currentWorld.currentWorldLocations.locationMap[locationId];
      if (l) {
        l.mapBackgroundImageFilename = mapBackgroundImageFilename;
        l.mapBackgroundImageUrl = mapBackgroundImageUrl;
      }
    });
  },

  updateMapBackgroundImageUrl: (locationId, filename) => {
    const worldId = getState().worlds.currentWorld.currentWorldId ?? "";
    if (!worldId) return;
    if (!filename) {
      set((store) => {
        const loc = store.worlds.currentWorld.currentWorldLocations.locationMap[locationId];
        if (loc) loc.mapBackgroundImageUrl = undefined;
      });
      return;
    }
    getImageUrl(constructLocationImagePath(worldId, locationId) + "/" + filename)
      .then((url) => {
        set((store) => {
          const loc = store.worlds.currentWorld.currentWorldLocations.locationMap[locationId];
          if (loc) loc.mapBackgroundImageUrl = url;
        });
      })
      .catch(() => {});
  },

  removeLocationImage: async (locationId) => {
    const world = getState().worlds.currentWorld;
    const worldId = world.currentWorldId;
    const filename =
      world.currentWorldLocations.locationMap[locationId]?.imageFilenames?.[0];
    if (!worldId) return Promise.reject("No world found");
    if (!filename) return Promise.reject("Location did not have an image");
    await deleteImage(constructLocationImagePath(worldId, locationId), filename);
    await api.patch(`/api/worlds/${worldId}/locations/${locationId}`, { imageFilenames: [] });
    set((store) => {
      const loc = store.worlds.currentWorld.currentWorldLocations.locationMap[locationId];
      if (loc) {
        loc.imageFilenames = [];
        loc.imageUrl = undefined;
      }
    });
  },

  removeLocationMapBackground: async (locationId) => {
    const world = getState().worlds.currentWorld;
    const worldId = world.currentWorldId;
    const filename =
      world.currentWorldLocations.locationMap[locationId]?.mapBackgroundImageFilename;
    if (!worldId) return Promise.reject("No world found");
    if (!filename) return Promise.reject("Location did not have an image");
    await deleteImage(constructLocationImagePath(worldId, locationId), filename);
    const loc = getState().worlds.currentWorld.currentWorldLocations.locationMap[locationId];
    await api.patch(`/api/worlds/${worldId}/locations/${locationId}`, {
      dataJson: { ...((loc as any)?.dataJson ?? {}), mapBackgroundImageFilename: null },
    });
    set((store) => {
      const l = store.worlds.currentWorld.currentWorldLocations.locationMap[locationId];
      if (l) {
        l.mapBackgroundImageFilename = undefined;
        l.mapBackgroundImageUrl = undefined;
      }
    });
  },

  subscribeToOpenLocation: (locationId) => {
    const state = getState();
    const worldId = state.worlds.currentWorld.currentWorldId;
    const isWorldOwner =
      state.worlds.currentWorld.currentWorld?.ownerIds?.includes(state.auth.uid ?? "") ?? false;
    if (!worldId) return () => {};

    let active = true;

    api
      .get<any>(`/api/worlds/${worldId}/locations/${locationId}/notes`)
      .then((row) => {
        if (!active || !row?.content) return;
        const content = new Uint8Array(row.content.data ?? row.content);
        set((store) => {
          const loc = store.worlds.currentWorld.currentWorldLocations.locationMap[locationId];
          if (loc) loc.notes = content;
        });
      })
      .catch(() => {});

    if (isWorldOwner) {
      api
        .get<any>(`/api/worlds/${worldId}/locations/${locationId}/private-notes`)
        .then((row) => {
          if (!active) return;
          set((store) => {
            const loc = store.worlds.currentWorld.currentWorldLocations.locationMap[locationId];
            if (loc) loc.gmProperties = row?.dataJson ?? null;
          });
        })
        .catch(() => {});
    } else {
      set((store) => {
        const loc = store.worlds.currentWorld.currentWorldLocations.locationMap[locationId];
        if (loc) loc.gmProperties = null;
      });
    }

    return () => {
      active = false;
    };
  },

  resetStore: () => {
    set((store) => {
      store.worlds.currentWorld.currentWorldLocations = {
        ...store.worlds.currentWorld.currentWorldLocations,
        ...defaultLocationsSlice,
      };
    });
  },
});
