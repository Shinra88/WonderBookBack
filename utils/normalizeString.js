function normalize(str) {
    return str
      .toLowerCase()
      .normalize("NFD") // décompose accents
      .replace(/[\u0300-\u036f]/g, "") // supprime accents
      .replace(/['’]/g, "") // supprime apostrophes
      .replace(/[^a-z0-9\s]/gi, ""); // supprime ponctuation non utile
  }
  