import { InitiativeStatus } from "types/Character.type";
import { InitiativeStatusChip } from "components/features/characters/InitiativeStatusChip";
import { useStore } from "stores/store";
import { useUpdateCharacterMutation } from "hooks/queries/useCharactersQuery";

export function InitiativeButtons() {
  const characterId = useStore(
    (store) => store.characters.currentCharacter.currentCharacterId
  );
  const initiativeStatus = useStore(
    (store) =>
      store.characters.currentCharacter.currentCharacter?.initiativeStatus ??
      InitiativeStatus.OutOfCombat
  );

  const updateCharacter = useUpdateCharacterMutation(characterId ?? "");

  const updateCharacterInitiative = (status: InitiativeStatus) => {
    updateCharacter.mutateAsync({ initiativeStatus: status }).catch();
  };

  return (
    <InitiativeStatusChip
      status={initiativeStatus}
      handleStatusChange={(status) => updateCharacterInitiative(status)}
    />
  );
}
