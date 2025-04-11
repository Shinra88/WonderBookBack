# Étape 1 : Utiliser une image Node.js
FROM node:20

# Étape 2 : Définir le répertoire de travail
WORKDIR /app

# Étape 3 : Copier package.json
COPY package*.json ./

# Étape 4 : Installer les dépendances (dev incluses car en dev)
# RUN npm install && npm install mongodb && npm install mysql2 && npm install bcrypt && npm install multer && npm install aws-sdk
RUN  npm install

# Étape 5 : Copier le reste du projet
COPY . .

# Étape 6 : Exposer le port
EXPOSE 5000

# Étape 7 : Utiliser nodemon pour recharger automatiquement
# CMD ["node", "server.js"]
CMD ["npx", "nodemon", "server.js"]

