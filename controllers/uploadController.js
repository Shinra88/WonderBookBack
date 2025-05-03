// ✅ controllers/uploadController.js
const AWS = require("aws-sdk");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const bucketName = process.env.S3_BUCKET_NAME;
const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

const uploadImageToS3 = async (buffer, key, contentType = "image/webp") => {
  await s3.putObject({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }).promise();

  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
};

exports.uploadImageToS3 = uploadImageToS3;

AWS.config.update({
  accessKeyId,
  secretAccessKey,
  region,
  signatureVersion: 'v4',
});

const s3 = new AWS.S3();

exports.updateAvatar = async (req, res) => {
  const { oldUrl, userId, name } = req.body;

  if (!req.file || !userId || !name) {
    return res.status(400).json({ error: "Fichier, userId ou nom manquant." });
  }

  const safeName = name.replace(/[^a-z0-9_-]/gi, "").toLowerCase();
  const newKey = `avatars/${userId}-${safeName}-avatar.webp`;

  if (oldUrl && oldUrl.includes(bucketName)) {
    try {
      const keyToDelete = decodeURIComponent(oldUrl.split(".com/")[1]);
      if (keyToDelete.includes("/")) {
        await s3.deleteObject({ Bucket: bucketName, Key: keyToDelete }).promise();
      }
    } catch (err) {
      console.error("Erreur suppression ancienne image :", err);
    }
  }

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

    res.json({ imageUrl });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la mise à jour de l'avatar." });
  }
};

exports.uploadCover = async (req, res) => {
  if (!req.file || !req.body.title) {
    return res.status(400).json({ error: "Fichier ou titre manquant." });
  }

  const file = req.file;
  const safeTitle = req.body.title.replace(/[^a-z0-9_-]/gi, "").toLowerCase();
  const newKey = `covers/${safeTitle}.webp`;

  try {
    await s3.putObject({
      Bucket: bucketName,
      Key: newKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    }).promise();

    const imageUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${newKey}`;
    res.status(200).json({ imageUrl });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de l'upload de la couverture." });
  }
};
