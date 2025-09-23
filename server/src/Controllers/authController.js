import { nanoid } from "nanoid";
import jwt from "jsonwebtoken";
import { createUser, findUserByEmail } from "../DB/neon.js";
import { hashPassword, verifyPassword } from "../utils/crypto.js";

export async function registerUser(req, res) {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password)
      return res.status(400).json({ error: "Missing fields" });

    const exists = await findUserByEmail(email);
    if (exists)
      return res.status(409).json({ error: "Email already registered" });

    await createUser({
      id: nanoid(),
      name,
      email,
      passwordHash: hashPassword(password),
    });

    return res.json({ ok: true });
  } catch (e) {
    console.error(e.message);
    return res.status(500).json({ error: "Register failed" });
  }
}

export async function loginUser(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ error: "Missing fields" });

    const user = await findUserByEmail(email);
    if (!user || !verifyPassword(password, user.password_hash))
      return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return res.json({
      ok: true,
      user: { id: user.id, name: user.name, email: user.email },
      token,
    });
  } catch (e) {
    console.log(e.message);
    return res.status(500).json({ error: "Login failed" });
  }
}

export async function logoutUser(_req, res) {
  res.clearCookie("token");
  return res.json({ ok: true });
}

export async function verifyUser(req, res) {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ error: "Auth required" });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return res.json({
      ok: true,
    });
  } catch (e) {
    return res.status(401).json({ error: "Invalid/expired token" });
  }
}

export async function getUser(req, res) {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ error: "Auth required" });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await findUserByEmail(payload.email);
    if(!user) return res.status(401).json({ error: "User not found" });
    return res.json({
      ok: true,
      user:{id: user.id, email: user.email, name: user.name},
    });
  } catch (e) {
    return res.status(401).json({ error: "Invalid/expired token" });
  }
}


export const setToken = async (req,res) => {
  try {
    const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }

  // Verify the token is valid
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  
  // Set the cookie that your requireAuth middleware expects
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none', // Allow cross-site cookies
    domain: process.env.NODE_ENV === 'production' 
    ? undefined // Allow subdomains
    : 'localhost', // Set for localhost domain
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/'
  });

  res.json({ 
    success: true, 
    message: "Token set successfully",
    user: { id: payload.id, email: payload.email }
  });
} catch (error) {
  console.error('Set token error:', error);
  res.status(401).json({ error: "Invalid token" });
}
}