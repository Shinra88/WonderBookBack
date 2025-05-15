// controllers/adminController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 🔍 GET /api/users → liste tous les utilisateurs
exports.getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                userId: true,
                name: true,
                mail: true,
                role: true,
                avatar: true,
                aboutMe: true,
                repForum: true,
                addCom: true,
                addBook: true,
                news: true,
                status: true,
                created_at: true,
              },            
            orderBy: {
              created_at: 'desc'
            }
          });          
  
      res.json(users);
    } catch (err) {
      console.error('❌ Erreur dans getAllUsers:', err);
      res.status(500).json({ error: 'Erreur serveur.' });
    }
  };  

// ✏️ PUT /api/users/:id → modifier rôle ou infos
exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const {
        name,
        mail,
        avatar,
        aboutMe,
        role,
        status,
        repForum,
        addCom,
        addBook,
        news,
      } = req.body;
      
      try {
        const updated = await prisma.user.update({
          where: { userId: Number(id) },
          data: {
            name,
            mail,
            avatar,
            aboutMe,
            role,
            status,
            repForum: repForum ? 1 : 0,
            addCom: addCom ? 1 : 0,
            addBook: addBook ? 1 : 0,
            news: news ? 1 : 0,
          },
        });
      
        res.json({ message: "Utilisateur mis à jour", user: updated });
      } catch (err) {
        console.error("❌ Erreur updateUser:", err);
        res.status(500).json({ error: "Erreur serveur" });
      }
      
  };  

// ❌ DELETE /api/users/:id → supprimer un utilisateur
exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.user.delete({ where: { userId: Number(id) } });
    res.json({ message: "Utilisateur supprimé" });
  } catch (err) {
    console.error("Erreur deleteUser:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

exports.updateUserStatus = async (req, res) => {
    const userId = parseInt(req.params.id);
    const { status } = req.body;
  
    if (!['active', 'suspended', 'banned'].includes(status)) {
      return res.status(400).json({ error: 'Statut invalide.' });
    }
  
    // Limite les modérateurs à active/suspended uniquement
    if (req.user.role === 'moderator' && status === 'banned') {
      return res.status(403).json({ error: 'Action non autorisée pour les modérateurs.' });
    }
  
    try {
      const updated = await prisma.user.update({
        where: { userId },
        data: { status },
      });
      res.json({ message: 'Statut mis à jour.', user: updated });
    } catch (err) {
      console.error('❌ Erreur updateUserStatus:', err);
      res.status(500).json({ error: 'Erreur serveur.' });
    }
  };
  
