import { ReferenceSidebarLocation } from "../enums.js";

export interface UserLayout {
  referenceSidebarLocation?: ReferenceSidebarLocation;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  hidePhoto: boolean;
  layout: UserLayout;
  appVersion?: string;
}
