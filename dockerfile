# Étape 1 : Utiliser une image Node.js comme base
FROM node:20

# Étape 2 : Définir le répertoire de travail
WORKDIR /app

# Étape 3 : Copier les fichiers package.json et package-lock.json
COPY package*.json ./

# # Étape 4 : Installer les dépendances
# RUN npm install
# RUN npx prisma generate

COPY . ./

# Étape 6 : Exposer le port de l'API
EXPOSE 5000

# Étape 7 : Démarrer le serveur
CMD ["node", "server.js"]