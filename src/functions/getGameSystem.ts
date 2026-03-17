import { GAME_SYSTEMS } from "types/GameSystems.type";

const PROD_HOSTNAME_IRONSWORN = "iron-fellowship.scottbenton.dev";
const PROD_HOSTNAME_STARFORGED = "starforged-crew-link.scottbenton.dev";
const prodHostnames = [PROD_HOSTNAME_IRONSWORN, PROD_HOSTNAME_STARFORGED];
const DEV_HOSTNAME_START_IRONSWORN = "iron-fellowship-dev";
const DEV_HOSTNAME_START_STARFORGED = "crew-link-dev";

const STARFORGED_FIREBASE_PROJECT_ID = import.meta.env.VITE_CREW_LINK_FIREBASE_PROJECTID as string | undefined;

export function getGameSystem() {
  let system: GAME_SYSTEMS = GAME_SYSTEMS.IRONSWORN;
  if (location.hostname === PROD_HOSTNAME_IRONSWORN) {
    system = GAME_SYSTEMS.IRONSWORN;
  } else if (location.hostname === PROD_HOSTNAME_STARFORGED) {
    system = GAME_SYSTEMS.STARFORGED;
  } else if (location.hostname.startsWith(DEV_HOSTNAME_START_IRONSWORN)) {
    system = GAME_SYSTEMS.IRONSWORN;
  } else if (location.hostname.startsWith(DEV_HOSTNAME_START_STARFORGED)) {
    system = GAME_SYSTEMS.STARFORGED;
  } else if (
    STARFORGED_FIREBASE_PROJECT_ID &&
    (location.hostname.startsWith(STARFORGED_FIREBASE_PROJECT_ID + ".") ||
      location.hostname === STARFORGED_FIREBASE_PROJECT_ID + ".web.app" ||
      location.hostname === STARFORGED_FIREBASE_PROJECT_ID + ".firebaseapp.com")
  ) {
    system = GAME_SYSTEMS.STARFORGED;
  }
  return system;
}

export function getIsProdEnvironment() {
  return prodHostnames.includes(location.hostname);
}

export function getIsLocalEnvironment() {
  return location.hostname === "localhost";
}
