// categoryController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await prisma.categories.findMany({
      select: {
        categoryId: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération des catégories." });
  }
};
