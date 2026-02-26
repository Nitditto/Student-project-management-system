import { asyncHandler } from "../middleware/asyncHandler.js";
import ErrorHandler from "../middleware/error.js";
import { User } from "../models/user.js";
import { generateToken } from "../utils/generateToken.js";

// REGISTER USER
export const registerUser = asyncHandler(async (req, res, next) => {
  const {name, email, password, role} = req.body;
  if(!name || !email || !password || !role){
    return next(new ErrorHandler("Please provide all the fields", 400))
  }
  let user = await User.findOne({email})
  if(user){
    return next(new ErrorHandler(`User with email ${user.email} already exists`, 400));
  }
  user = new User({name, email, password, role});
  await user.save();
  generateToken(user, 201, "User registered successfully", res)
})

// LOGIN USER
export const loginUser = asyncHandler(async (req, res, next) => {

})

export const getUser = asyncHandler(async (req, res, next) => {

})
export const logout = asyncHandler(async (req, res, next) => {

})
export const forgotPassword = asyncHandler(async (req, res, next) => {

})
export const resetPassword = asyncHandler(async (req, res, next) => {

})
