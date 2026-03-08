import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { axiosInstance } from "../../lib/axios";
import { toast } from "react-toastify";

export const login = createAsyncThunk("login", async (data, thunkAPI) => {
  try {
    const res = await axiosInstance.post("/auth/login", data, {
      headers: {"Content-Type": "application/json"}
    });
    toast.success(res.data.message);
    return res.data.user;
  } catch (error) {
    toast.error(error.response.data.message);
    return thunkAPI.rejectWithValue(error.response.data.message);
  }
});

export const forgotPassword = createAsyncThunk(
  "auth/password/forgot",
  async (email, thunkAPI) => {
    try {
      const res = await axiosInstance.post("/auth/password/forgot", email);
      toast.success(res.data.message);
      return null;
    } catch (error) {
      toast.error(error.response.data.message);
      return thunkAPI.rejectWithValue(error.response.data.message);
    }
  },
);

export const resetPassword = createAsyncThunk(
  "auth/password/reset",
  async ({token ,password, confirmPassword}, thunkAPI) => {
    try {
      const res = await axiosInstance.put(`/auth/password/reset/${token}`, {password, confirmPassword});
      toast.success(res.data.message);
      return res.data.user;
    } catch (error) {
      toast.error(error.response.data.message || "Failed to reset password");
      return thunkAPI.rejectWithValue(error.response.data.message);
    }
  },
);

export const getUser = createAsyncThunk(
  "auth/me",
  async (_, thunkAPI) => {
    try {
      const res = await axiosInstance.get("/auth/me");
      return res.data.user;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data.message || "Failed to fetch user");
    }
  },
);

export const logout = createAsyncThunk(
  "auth/logout",
  async (_, thunkAPI) => {
    try {
      const res = await axiosInstance.get("/auth/logout");
      return null
    } catch (error) {
      toast.error(eror.response.data.message || "Failed to logout")
      return thunkAPI.rejectWithValue(error.response.data.message || "Failed to logout");
    }
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    authUser: null,
    isSigningUp: false,
    isLoggingIn: false,
    isUpdatingProfile: false,
    isUpdatingPassword: false,
    isRequestingForToken: false,
    isCheckingAuth: true,
  },
  extraReducers: (builder) => {
    builder.addCase(login.pending, (state) => {
      state.isLoggingIn = true;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      state.isLoggingIn = false;
      state.authUser = action.payload;
    });
    builder.addCase(login.rejected, (state) => {
      state.isLoggingIn = false;
    });

    builder.addCase(getUser.pending, (state) => {
      state.isCheckingAuth = true;
      state.authUser = null
    });
    builder.addCase(getUser.fulfilled, (state, action) => {
      state.isCheckingAuth = false;
      state.authUser = action.payload
    });
    builder.addCase(getUser.rejected, (state) => {
      state.isCheckingAuth = false;
      state.authUser = null
    });

    
    builder.addCase(logout.fulfilled, (state, action) => {
      state.authUser = null
    });
    builder.addCase(logout.rejected, (state) => {
      state.authUser = state.authUser
    });

    builder.addCase(forgotPassword.pending, (state) => {
      state.isRequestingForToken = true;
    });
    builder.addCase(forgotPassword.fulfilled, (state, action) => {
      state.isRequestingForToken = false
    });
    builder.addCase(forgotPassword.rejected, (state) => {
      state.isRequestingForToken = false
    });

    builder.addCase(resetPassword.pending, (state) => {
      state.isUpdatingPassword = true;
    });
    builder.addCase(resetPassword.fulfilled, (state, action) => {
      state.isUpdatingPassword = false
      state.authUser = action.payload
    });
    builder.addCase(resetPassword.rejected, (state) => {
      state.isUpdatingPassword = false
      
    });
  },
});

export default authSlice.reducer;
