import type { UserProfile } from "@starforged/shared";

export enum AUTH_STATE {
  LOADING,
  UNAUTHENTICATED,
  AUTHENTICATED,
}

export interface AuthSliceData {
  user?: UserProfile;
  uid: string;
  status: AUTH_STATE;
  userNameDialogOpen: boolean;
}

export interface AuthSliceActions {
  subscribe: () => () => void;
  closeUserNameDialog: () => void;
  updateUser: (patch: Partial<UserProfile>) => Promise<void>;
}

export type AuthSlice = AuthSliceData & AuthSliceActions;
