import { CreateSliceType } from "stores/store.type";
import { UserSlice } from "./users.slice.type";
import { defaultUserSlice } from "./users.slice.default";
import { api } from "config/api.config";

export const createUsersSlice: CreateSliceType<UserSlice> = (
  set,
  getState
) => ({
  ...defaultUserSlice,
  loadUserDocument: (userId) => {
    const existingDoc = getState().users.userMap[userId];
    if (!existingDoc) {
      set((store) => {
        store.users.userMap[userId] = { loading: true };
      });
      api
        .get<any>(`/api/users/${userId}`)
        .then((doc) => {
          set((store) => {
            store.users.userMap[userId] = { loading: false, doc };
          });
        })
        .catch(() => {
          set((store) => {
            store.users.userMap[userId] = { loading: false };
          });
        });
    }
  },
  loadUserDocuments: (userIds) => {
    userIds.forEach((uid) => {
      const existingDoc = getState().users.userMap[uid];
      if (!existingDoc) {
        set((store) => {
          store.users.userMap[uid] = { loading: true };
        });
        api
          .get<any>(`/api/users/${uid}`)
          .then((doc) => {
            set((store) => {
              store.users.userMap[uid] = { loading: false, doc };
            });
          })
          .catch(() => {
            set((store) => {
              store.users.userMap[uid] = { loading: false };
            });
          });
      }
    });
  },
});
