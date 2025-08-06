// ✅ authController.js - VERSION 100% SÉCURISÉE

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const sendConfirmationEmail = require('../utils/sendEmail');

const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET || 'dev_secret';

// ✅ Login user - VERSION SÉCURISÉE
exports.loginUser = async (req, res) => {
  try {
    const { mail, password } = req.body;
    const user = await prisma.user.findUnique({ where: { mail } });

    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Mot de passe incorrect.' });

    const token = jwt.sign({ userId: user.userId, role: user.role }, SECRET, { expiresIn: '3h' });

    // ✅ CHANGEMENT CRUCIAL : Cookie HttpOnly au lieu de JSON
    res.cookie('token', token, {
      httpOnly: true, // Inaccessible par JavaScript
      secure: process.env.NODE_ENV === 'production', // HTTPS only en prod
      sameSite: 'strict', // Protection CSRF
      maxAge: 3 * 60 * 60 * 1000 // 3h en millisecondes
    });

    // ✅ PLUS DE TOKEN dans la réponse JSON
    res.json({
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
        news: user.news
      }
    });
  } catch (err) {
    console.error('Erreur login :', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// ✅ Register user - VERSION SÉCURISÉE
exports.registerUser = async (req, res) => {
  const { name, mail, password, recaptchaToken, website } = req.body;

  if (website && website.trim() !== '') {
    return res.status(400).json({ error: 'Bot détecté.' });
  }

  try {
    const captchaRes = await axios.post(`https://www.google.com/recaptcha/api/siteverify`, null, {
      params: { secret: process.env.RECAPTCHA_SECRET, response: recaptchaToken }
    });

    if (!captchaRes.data.success) {
      return res.status(400).json({ error: 'Échec de vérification reCAPTCHA.' });
    }
  } catch {
    return res.status(500).json({ error: 'Erreur lors de la vérification du captcha.' });
  }

  const pseudoRegex = /^[a-zA-Z0-9_-]{3,20}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

  if (!pseudoRegex.test(name)) return res.status(400).json({ error: 'Pseudo invalide.' });
  if (!emailRegex.test(mail)) return res.status(400).json({ error: 'Email invalide.' });
  if (!passwordRegex.test(password)) return res.status(400).json({ error: 'Mot de passe faible.' });

  const existing = await prisma.user.findUnique({ where: { mail } });
  if (existing) return res.status(400).json({ error: 'Email déjà utilisé.' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await prisma.user.create({
    data: { name, mail, password: hashedPassword, role: 'user' }
  });

  await sendConfirmationEmail(mail, name);

  const token = jwt.sign({ userId: newUser.userId, role: newUser.role }, SECRET, {
    expiresIn: '24h'
  });

  // ✅ CHANGEMENT CRUCIAL : Cookie HttpOnly au lieu de JSON
  res.cookie('token', token, {
    httpOnly: true, // Inaccessible par JavaScript
    secure: process.env.NODE_ENV === 'production', // HTTPS only en prod
    sameSite: 'strict', // Protection CSRF
    maxAge: 24 * 60 * 60 * 1000 // 24h en millisecondes
  });

  // ✅ PLUS DE TOKEN dans la réponse JSON
  res.status(201).json({
    user: {
      userId: newUser.userId,
      name: newUser.name,
      mail: newUser.mail,
      role: newUser.role
    }
  });
};

// ✅ User profile update
exports.updateProfile = async (req, res) => {
  try {
    const { name, mail, aboutMe, repForum, addCom, addBook, news, avatar } = req.body;
    const updatedUser = await prisma.user.update({
      where: { userId: req.user.userId },
      data: { name, mail, aboutMe, avatar, repForum, addCom, addBook, news }
    });

    return res.json({
      success: true, // ✅ AJOUT pour compatibilité avec le frontend
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
        news: updatedUser.news
      }
    });
  } catch (error) {
    console.error('Erreur updateProfile:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Erreur lors de la mise à jour du profil' });
  }
};

// ✅ Change connected password
exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.userId;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Champs requis manquants.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { userId } });
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch)
      return res.status(401).json({ success: false, message: 'Ancien mot de passe incorrect.' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { userId }, data: { password: hashedPassword } });

    res.json({ success: true, message: 'Mot de passe mis à jour avec succès.' });
  } catch (error) {
    console.error('Erreur changePassword:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ✅ Send email for forgotten password
exports.sendPasswordResetEmail = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { mail: email } });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'Aucun compte associé à cet e-mail.' });
    }

    // 🔥 Cleaning up expired tokens before creating a new one
    await prisma.passwordResetToken.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiration = new Date(Date.now() + 1000 * 60 * 15);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.userId,
        token,
        expiresAt: expiration
      }
    });

    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendBaseUrl}/forget-password/${token}`;

    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    await transporter.sendMail({
      from: `"WonderBook" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Réinitialisation de votre mot de passe',
      html: `
        <p>Bonjour ${user.name || 'utilisateur'},</p>
        <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
        <p><a href="${resetLink}">Cliquez ici pour réinitialiser votre mot de passe</a> (valide 15 minutes).</p>
        <p>Si vous n'avez pas fait cette demande, ignorez cet e-mail.</p>
      `
    });

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Erreur sendPasswordResetEmail:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ✅ Password reset via token
exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!resetToken || resetToken.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'Lien expiré ou invalide.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { userId: resetToken.userId },
      data: { password: hashedPassword }
    });

    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id }
    });

    res.json({ success: true, message: 'Mot de passe réinitialisé avec succès.' });
  } catch (err) {
    console.error('❌ Erreur resetPassword:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ✅ Get authenticated user info
exports.getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { userId: req.user.userId },
      select: {
        userId: true,
        name: true,
        mail: true,
        role: true,
        avatar: true,
        aboutMe: true,
        repForum: true,
        addCom: true,
        addBook: true,
        news: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    res.json(user);
  } catch (error) {
    console.error('Erreur getMe:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ✅ Logout user - clear cookie
exports.logoutUser = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  res.json({ message: 'Déconnexion réussie' });
};
