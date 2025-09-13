# Utiliser l'image officielle Node
FROM node:22

# Définir le dossier de travail
WORKDIR /usr/src/app

# Copier package.json et package-lock.json pour installer les dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier tout le projet
COPY . .

# Exposer un port (optionnel pour Discord, mais nécessaire pour Railway Docker)
EXPOSE 3000

# Commande pour lancer le bot
CMD ["npm", "start"]