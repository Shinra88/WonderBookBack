export function normalize(str = "") {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // accents
    .replace(/['’"]/g, "")           // apostrophes
    .replace(/[^a-z0-9\s]/g, "")     // caractères spéciaux (mais on garde les espaces)
    .replace(/\s+/g, " ")            // espaces multiples -> simple espace
    .trim();
}
