import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  setToken,
  getUser,
  verifyUser,
} from "../Controllers/authController.js";

const router = Router();
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.post("/set-token", setToken);
router.get("/me", getUser);
router.get("/verify", verifyUser);

export default router;
