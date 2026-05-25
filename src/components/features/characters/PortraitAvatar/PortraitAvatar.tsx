import { useEffect } from "react";
import { useStore } from "stores/store";
import { AvatarSizes, PortraitAvatarDisplay } from "./PortraitAvatarDisplay";

export interface PortraitAvatarProps {
  uid: string;
  characterId: string;
  name?: string;
  portraitSettings?: {
    url: string;
    position: {
      x: number;
      y: number;
    };
    scale: number;
  };
  size?: AvatarSizes;
  colorful?: boolean;
  rounded?: boolean;
  darkBorder?: boolean;
}

export function PortraitAvatar(props: PortraitAvatarProps) {
  const {
    uid,
    characterId,
    name,
    portraitSettings,
    colorful,
    size,
    darkBorder,
    rounded,
  } = props;

  const loadPortrait = useStore(
    (store) => store.characters.loadCharacterPortrait
  );
  const portraitUrl = useStore(
    (store) => store.characters.characterPortraitMap[characterId]?.url
  );

  const url = portraitSettings?.url;
  useEffect(() => {
    loadPortrait(uid, characterId, url);
  }, [uid, characterId, url, loadPortrait]);

  return (
    <PortraitAvatarDisplay
      size={size}
      colorful={colorful}
      rounded={rounded}
      darkBorder={darkBorder}
      portraitSettings={portraitSettings}
      characterId={characterId}
      portraitUrl={portraitUrl}
      name={name}
      loading={!name}
    />
  );
}
