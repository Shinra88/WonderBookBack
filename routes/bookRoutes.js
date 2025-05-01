// Book routes
const express = require("express");
const router = express.Router();
// const authorizeRoles = require("../middleware/authorizeRoles");
const authenticate = require("../middleware/authenticate");
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


module.exports = router;
