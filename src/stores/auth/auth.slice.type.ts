import { UserDocument } from "api-calls/user/_user.type";
import type { User } from "@supabase/supabase-js";

export enum AUTH_STATE {
  LOADING,
  UNAUTHENTICATED,
  AUTHENTICATED,
}

export interface AuthSliceData {
  user?: User;
  uid: string;
  status: AUTH_STATE;
  userNameDialogOpen: boolean;
  userDoc?: UserDocument;
}

export interface AuthSliceActions {
  subscribe: () => () => void;
  subscribeToUser: (uid: string) => () => void;
  closeUserNameDialog: () => void;
  updateUserDoc: (doc: Partial<UserDocument>) => void;
}

export type AuthSlice = AuthSliceData & AuthSliceActions;
