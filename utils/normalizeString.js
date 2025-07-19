function normalize(str = "") {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // accents
    .replace(/['’"]/g, "")           // apostrophes
    .replace(/[^a-z0-9\s]/g, "")     // special characters (keep spaces)
    .replace(/\s+/g, " ")            // multiple spaces → single space
    .trim();
}

module.exports = { normalize };
