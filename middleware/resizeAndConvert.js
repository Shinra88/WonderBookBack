// 📁 middleware/resizeAndConvert.js
const sharp = require("sharp");

module.exports = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const originalName = req.file.originalname?.split(".")[0] || "image";

    // 🔄 Conversion en webp avec dimension fixe
    const buffer = await sharp(req.file.buffer)
      .resize(400, 540, { fit: "cover", position: "center" })
      .toFormat("webp", { quality: 80 })
      .toBuffer();

    // ✅ Mise à jour du fichier pour multer/S3
    req.file.buffer = buffer;
    req.file.originalname = `${originalName}.webp`;
    req.file.mimetype = "image/webp";

    next();
  } catch (err) {
    console.error("❌ Erreur lors de la transformation WebP :", err.message);
    res.status(500).json({ error: "Erreur traitement image." });
  }
};
