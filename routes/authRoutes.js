const express = require("express");
const bcrypt = require('bcryptjs');
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const { generateToken } = require("../utils/jwt");
const hashPassword = require("../middleware/hashPassword");
const router = express.Router();
const prisma = new PrismaClient();
const authenticate = require("../middleware/authenticate");
const axios = require("axios");
const sendConfirmationEmail = require("../utils/sendEmail");


router.post("/register", hashPassword, async (req, res) => {
  const { name, mail, password, recaptchaToken, website } = req.body;
  console.log("📨 Reçu:", { name, mail, password, recaptchaToken, website });

  // Honeypot
  if (website && website.trim() !== "") {
    console.log("🚨 Honeypot activé !");
    return res.status(400).json({ error: "Bot détecté." });
  }

  // Vérif reCAPTCHA
  try {
    const captchaRes = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify`,
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET,
          response: recaptchaToken,
        },
      }
    );

    console.log("✅ CAPTCHA:", captchaRes.data);

    if (!captchaRes.data.success) {
      console.log("❌ CAPTCHA invalide");
      return res.status(400).json({ error: "Échec de vérification reCAPTCHA." });
    }
  } catch (err) {
    console.error("💥 Erreur reCAPTCHA:", err);
    return res.status(500).json({ error: "Erreur lors de la vérification du captcha." });
  }

  // Vérif regex
  const pseudoRegex = /^[a-zA-Z0-9_-]{3,20}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

  if (!pseudoRegex.test(name)) {
    console.log("❌ Pseudo invalide");
    return res.status(400).json({ error: "Pseudo invalide." });
  }

  if (!emailRegex.test(mail)) {
    console.log("❌ Email invalide");
    return res.status(400).json({ error: "Email invalide." });
  }

  if (!passwordRegex.test(password)) {
    console.log("❌ Mot de passe faible");
    return res.status(400).json({ error: "Mot de passe faible." });
  }

  const existing = await prisma.user.findUnique({ where: { mail } });
  if (existing) {
    console.log("❌ Email déjà utilisé");
    return res.status(400).json({ error: "Email déjà utilisé." });
  }

  const newUser = await prisma.user.create({
    data: {
      name,
      mail,
      password,
      role: "user",
    },
  });
  
  console.log("✅ Utilisateur créé:", newUser);
  
  const emailSent = await sendConfirmationEmail(mail, name);
  console.log(emailSent ? "📧 Email envoyé avec succès" : "❌ Échec de l’envoi de l’email");
  
    
  const token = generateToken({ userId: newUser.userId, role: newUser.role });

  res.status(201).json({
    token,
    user: {
      userId: newUser.userId,
      name: newUser.name,
      mail: newUser.mail,
      role: newUser.role,
    },
  });
});


// ✅ CONNEXION
router.post("/login", async (req, res) => {
  try {
    const { mail, password } = req.body;

    if (!mail || !password) {
      return res.status(400).json({ error: "Mail et mot de passe requis." });
    }

    const user = await prisma.user.findUnique({ where: { mail } });
    console.log(user);
    if (!user) {
      return res.status(401).json({ error: "Mail invalide." });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Mot de passe incorrect." });
    }

    const { generateToken } = require("../utils/jwt"); // en haut du fichier si pas encore importé
    const token = generateToken({ userId: user.userId, role: user.role });
    
    return res.json({
      token,
      user: {
        userId: user.userId,
        name: user.name,
        mail: user.mail,
        role: user.role,
        avatar: user.avatar,
        aboutMe: user.aboutMe,
        repForum: user.repForum,
        addCom: user.addCom,
        addBook: user.addBook,
        news: user.news,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

// ✅ MISE À JOUR DU PROFIL CONNECTÉ
router.put("/profile", authenticate, async (req, res) => {
  try {
    const { name, mail, aboutMe, repForum, addCom, addBook, news, avatar } = req.body;

    const updatedUser = await prisma.user.update({
      where: { userId: req.user.userId },
      data: {
        name,
        mail,
        aboutMe,
        avatar,
        repForum,
        addCom,
        addBook,
        news,
      },
    });

    return res.json({
      message: "Profil mis à jour",
      user: {
        userId: updatedUser.userId,
        name: updatedUser.name,
        mail: updatedUser.mail,
        avatar: updatedUser.avatar,
        role: updatedUser.role,
        aboutMe: updatedUser.aboutMe,
        repForum: updatedUser.repForum,
        addCom: updatedUser.addCom,
        addBook: updatedUser.addBook,
        news: updatedUser.news,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: "Erreur lors de la mise à jour du profil" });
  }
});

// ✅ CHANGEMENT DE MOT DE PASSE
router.post("/change-password", authenticate, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.userId;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: "Champs requis manquants." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { userId } });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Ancien mot de passe incorrect." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { userId },
      data: { password: hashedPassword },
    });

    res.json({ message: "Mot de passe mis à jour avec succès." });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur." });
  }
});

module.exports = router;
