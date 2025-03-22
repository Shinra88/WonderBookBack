const express = require("express");
const multer = require("multer");
const AWS = require("aws-sdk");
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: "eu-north-1",
});

const s3 = new AWS.S3();

router.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Aucun fichier envoyé." });
  }

  const params = {
    Bucket: "wonderbook-images",
    Key: `covers/${Date.now()}_${req.file.originalname}`,
    Body: req.file.buffer,
    ContentType: req.file.mimetype,
    ACL: "public-read",
  };

  try {
    const data = await s3.upload(params).promise();
    res.json({ imageUrl: data.Location });
  } catch (error) {
    console.error("Erreur AWS S3 :", error);
    res.status(500).json({ error: "Erreur lors de l'upload sur S3." });
  }
});

module.exports = router;
