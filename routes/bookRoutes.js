// Book routes
const express = require("express");
const router = express.Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });
const authenticate = require("../middleware/authenticate");
const authorizeRoles = require("../middleware/authorizeRoles");
const resizeAndConvert = require("../middleware/resizeAndConvert");
const bookController = require("../controllers/bookController");

const {
  getAllBooks,
  getBestRatedBooks,
  getLastAddedBooks,
  addBook,
  getBookByTitle,
  getMinYear,
} = require("../controllers/bookController");

// 📘 Routes publiques
router.get("/", getAllBooks);
router.get("/bestrating", getBestRatedBooks);
router.get("/lastadded", getLastAddedBooks);
router.get("/title/:title", getBookByTitle);
router.get('/minyear', getMinYear);

// 🔐 Route protégée pour ajouter un livre
router.post("/", authenticate, addBook);


// 🔐 Route protégée pour modifier un livre (admin uniquement)
router.put(
  "/:id/cover",
  authenticate,
  authorizeRoles("admin"),
  upload.single("cover"),       
  resizeAndConvert,             
  bookController.updateBookCover
);

module.exports = router;
