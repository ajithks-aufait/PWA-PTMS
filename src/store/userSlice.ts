import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

interface UserState {
  Id: number | null;
  Name: string;
  Email: string;
  userId: string;
  Token: string;
  DVAccessToken?: string;
}

const initialState: { user: UserState | null } = {
  user: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<UserState>) {
      state.user = action.payload;
    },
    clearUser(state) {
      state.user = null;
    },
    setDVAccessToken(state, action: PayloadAction<string>) {
      if (state.user) {
        state.user.DVAccessToken = action.payload;
      }
    },
  },
});

export const { setUser, clearUser, setDVAccessToken } = userSlice.actions;
export default userSlice.reducer; 