// Middleware d'authentification roles pour vérifier le rôle de l'utilisateur
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Accès interdit." });
    }
    next();
  };
}
 
  module.exports = authorizeRoles;
  