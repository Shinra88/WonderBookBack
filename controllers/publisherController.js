const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 📚 Retrieve all editors
const getAllPublishers = async (req, res) => {
  try {
    const publishers = await prisma.publishers.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(publishers);
  } catch (error) {
    console.error('❌ Erreur dans getAllPublishers :', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des éditeurs.' });
  }
};

module.exports = {
  getAllPublishers
};
