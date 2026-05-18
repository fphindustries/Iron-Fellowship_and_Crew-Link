import { CreateSliceType } from "stores/store.type";
import { UserSlice } from "./users.slice.type";
import { defaultUserSlice } from "./users.slice.default";

export const createUsersSlice: CreateSliceType<UserSlice> = () => ({
  ...defaultUserSlice,
});
