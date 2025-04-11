// File: routes/uploadS3.js
const express = require("express");
const multer = require("multer");
const AWS = require("aws-sdk");
const { PrismaClient } = require("@prisma/client");
const resizeAndConvert = require("../middleware/resizeAndConvert");

require("dotenv").config(); // Charge les variables du fichier .env

const router = express.Router();
const prisma = new PrismaClient();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// 🔐 Config depuis .env
const bucketName = process.env.S3_BUCKET_NAME;
const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

// ⚙️ Setup AWS SDK v2
AWS.config.update({
  accessKeyId,
  secretAccessKey,
  region,
  signatureVersion: 'v4',
});

const s3 = new AWS.S3();

console.log("🔍 S3 Config v2 =>", { accessKeyId: "****", region, bucket: bucketName });

// ✅ Route pour mettre à jour un avatar utilisateur
router.put("/update-avatar", upload.single("file"), resizeAndConvert, async (req, res) => {
  const { oldUrl, userId, name } = req.body;

  if (!req.file || !userId || !name) {
    return res.status(400).json({ error: "Fichier, userId ou nom manquant." });
  }

  const safeName = name.replace(/[^a-z0-9_-]/gi, "").toLowerCase();
  const newKey = `avatars/${userId}-${safeName}-avatar.webp`;

  console.log("🧪 DEBUG /update-avatar");
  console.log("📎 Nom du fichier :", req.file.originalname);
  console.log("📦 Taille du buffer :", req.file.buffer.length);

  // 🗑️ Suppression éventuelle de l’ancien avatar
  if (oldUrl && oldUrl.includes(bucketName)) {
    try {
      const keyToDelete = decodeURIComponent(oldUrl.split(".com/")[1]);
      if (keyToDelete.includes("/")) {
        await s3.deleteObject({
          Bucket: bucketName,
          Key: keyToDelete,
        }).promise();
        console.log("🗑️ Ancienne image supprimée :", keyToDelete);
      }
    } catch (err) {
      console.error("❌ Erreur suppression ancienne image :", err);
    }
  }

  // 📤 Upload S3
  try {
    await s3.putObject({
      Bucket: bucketName,
      Key: newKey,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    }).promise();

    const imageUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${newKey}`;

    await prisma.user.update({
      where: { userId: parseInt(userId) },
      data: { avatar: imageUrl },
    });

    console.log("✅ Avatar mis à jour :", imageUrl);
    res.json({ imageUrl });
  } catch (err) {
    console.error("❌ Erreur upload/update S3 (v2) :", err);
    res.status(500).json({ error: "Erreur lors de la mise à jour de l'avatar." });
  }
});

// ✅ Nouvelle route : upload d’image de couverture de livre
router.post("/cover", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Aucun fichier fourni." });
  }

  const file = req.file;
  const timestamp = Date.now();
  const originalName = file.originalname.replace(/\s+/g, "_").toLowerCase();
  const newKey = `covers/${timestamp}-${originalName}`;

  try {
    await s3.putObject({
      Bucket: bucketName,
      Key: newKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    }).promise();

    const imageUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${newKey}`;
    console.log("✅ Image couverture uploadée :", imageUrl);
    res.status(200).json({ imageUrl });
  } catch (err) {
    console.error("❌ Erreur upload cover :", err);
    res.status(500).json({ error: "Erreur lors de l'upload de la couverture." });
  }
});

module.exports = router;
