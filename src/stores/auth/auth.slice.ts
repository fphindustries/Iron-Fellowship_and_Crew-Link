import { CreateSliceType } from "stores/store.type";
import { AuthSlice, AUTH_STATE } from "./auth.slice.type";
import { defaultAuthSlice } from "./auth.slice.default";
import { supabase } from "config/supabase.config";
import { UserDocument } from "api-calls/user/_user.type";
import { clearAnalyticsUser, setAnalyticsUser } from "lib/analytics.lib";
import { updateUserDoc } from "api-calls/user/updateUserDoc";
import { listenToUserDoc } from "api-calls/user/listenToUserDoc";
import { updateUserDocNestedFields } from "api-calls/user/updateUserDocNestedFields";
import { ignoreApiError } from "api-calls/createApiFunction";

export const createAuthSlice: CreateSliceType<AuthSlice> = (set, getState) => ({
  ...defaultAuthSlice,

  subscribe: () => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      set((state) => {
        const user = session?.user;
        if (user) {
          const displayName =
            user.user_metadata?.full_name ??
            user.user_metadata?.name ??
            user.email ??
            "Unknown User";

          if (!displayName || displayName === "Unknown User") {
            state.auth.userNameDialogOpen = true;
          }

          const userDoc: UserDocument = { displayName };
          if (user.user_metadata?.avatar_url) {
            userDoc.photoURL = user.user_metadata.avatar_url as string;
          }

          setAnalyticsUser({ uid: user.id, email: user.email });
          updateUserDoc({ uid: user.id, user: userDoc }).catch((e) => {
            console.error(e);
          });

          state.auth.user = user;
          state.auth.uid = user.id;
          state.auth.status = AUTH_STATE.AUTHENTICATED;
        } else {
          clearAnalyticsUser();
          state.auth.user = undefined;
          state.auth.uid = "";
          state.auth.status = AUTH_STATE.UNAUTHENTICATED;
        }
      });
    });

    return () => subscription.unsubscribe();
  },

  subscribeToUser: (uid) => {
    return listenToUserDoc(uid, (user) => {
      set((state) => {
        state.auth.userDoc = user;
      });
    });
  },

  closeUserNameDialog: () => {
    set((state) => {
      state.auth.userNameDialogOpen = false;
    });
  },

  updateUserDoc: (doc: Partial<UserDocument>) => {
    const uid = getState().auth.uid;

    updateUserDocNestedFields({ uid, user: doc }).catch(ignoreApiError);
  },
});
