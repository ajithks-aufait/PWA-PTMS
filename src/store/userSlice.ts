import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

interface UserState {
  Id: number | null;
  Name: string;
  Email: string;
  userId: string;
  Token: string;
  DVAccessToken?: string;
  DVAccessTokenExpiry?: number;
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
    setDVAccessTokenWithExpiry(state, action: PayloadAction<{ token: string; expiry: number }>) {
      if (state.user) {
        state.user.DVAccessToken = action.payload.token;
        state.user.DVAccessTokenExpiry = action.payload.expiry;
      }
    },
  },
});

export const { setUser, clearUser, setDVAccessTokenWithExpiry } = userSlice.actions;
export default userSlice.reducer; 