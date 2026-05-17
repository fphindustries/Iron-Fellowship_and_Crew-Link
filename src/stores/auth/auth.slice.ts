import { CreateSliceType } from "stores/store.type";
import { AuthSlice, AUTH_STATE } from "./auth.slice.type";
import { defaultAuthSlice } from "./auth.slice.default";
import { getUser, updateUser } from "lib/auth.lib";

export const createAuthSlice: CreateSliceType<AuthSlice> = (set, _getState) => ({
  ...defaultAuthSlice,

  subscribe: () => {
    let active = true;

    const poll = async () => {
      try {
        const user = await getUser();
        if (!active) return;
        set((state) => {
          if (user) {
            if (!user.displayName) state.auth.userNameDialogOpen = true;
            state.auth.user = user;
            state.auth.uid = user.id;
            state.auth.status = AUTH_STATE.AUTHENTICATED;
          } else {
            state.auth.user = undefined;
            state.auth.uid = "";
            state.auth.status = AUTH_STATE.UNAUTHENTICATED;
          }
        });
      } catch {
        if (!active) return;
        set((state) => {
          state.auth.user = undefined;
          state.auth.uid = "";
          state.auth.status = AUTH_STATE.UNAUTHENTICATED;
        });
      }
    };

    poll();

    return () => {
      active = false;
    };
  },

  closeUserNameDialog: () => {
    set((state) => {
      state.auth.userNameDialogOpen = false;
    });
  },

  updateUser: async (patch) => {
    await updateUser(patch);
    set((state) => {
      if (state.auth.user) {
        Object.assign(state.auth.user, patch);
      }
    });
  },
});
