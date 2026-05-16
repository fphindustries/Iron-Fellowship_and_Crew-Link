import { addDoc } from "firebase/firestore";
import { momentumTrack } from "data/defaultTracks";
import { AssetDocument } from "api-calls/assets/_asset.type";
import {
  CharacterDocument,
  StatsMap,
} from "api-calls/character/_character.type";
import { getCharacterAssetCollection } from "../assets/_getRef";
import { getCharacterCollection } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";

export const createCharacter = createApiFunction<
  {
    uid: string;
    name: string;
    stats: StatsMap;
    assets: AssetDocument[];
    expansionIds?: string[];
    backstory?: string;
    pronouns?: string;
    callsign?: string;
    characteristics?: string;
    role?: string;
  },
  string
>((params) => {
  return new Promise((resolve, reject) => {
    const { uid, name, stats, assets, expansionIds, backstory, pronouns, callsign, characteristics, role } = params;
    const character: CharacterDocument = {
      uid: uid,
      name: name,
      stats: stats,
      conditionMeters: {},
      specialTracks: {},
      momentum: momentumTrack.startingValue,
    };
    if (expansionIds) {
      character.expansionIds = expansionIds;
    }
    if (backstory) {
      character.backstory = backstory;
    }
    if (pronouns) {
      character.pronouns = pronouns;
    }
    if (callsign) {
      character.callsign = callsign;
    }
    if (characteristics) {
      character.characteristics = characteristics;
    }
    if (role) {
      character.role = role;
    }

    addDoc(getCharacterCollection(), character)
      .then((doc) => {
        const id = doc.id;
        const assetPromises = assets.map((asset) =>
          addDoc(getCharacterAssetCollection(id), asset)
        );
        Promise.all(assetPromises)
          .then(() => {
            resolve(id);
          })
          .catch(() => {
            resolve(id);
          });
      })
      .catch((error) => {
        reject(error);
      });
  });
}, "Failed to create your character");
