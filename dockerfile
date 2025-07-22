FROM node:20

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=5000

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies 
RUN npm ci --only=production

# Copy application code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Debug: Vérifier la structure
RUN echo "=== DEBUG: Structure du projet ===" && \
    ls -la && \
    echo "=== DEBUG: Contenu app.js (10 premières lignes) ===" && \
    head -10 app.js && \
    echo "=== DEBUG: Contenu server.js (10 premières lignes) ===" && \
    head -10 server.js && \
    echo "=== DEBUG: Test require app.js ===" && \
    node -e "try { const app = require('./app'); console.log('✅ app.js import réussi'); } catch(e) { console.error('❌ Erreur import app.js:', e.message); }"

# Create user
RUN groupadd -r nodejs && useradd -r -g nodejs nodeuser
RUN chown -R nodeuser:nodejs /app
USER nodeuser

EXPOSE 5000

# Health check avec plus de détails
HEALTHCHECK --interval=30s --timeout=15s --start-period=90s --retries=5 \
    CMD node -e " \
    const http = require('http'); \
    const startTime = Date.now(); \
    console.log('🏥 [' + new Date().toISOString() + '] Démarrage health check...'); \
    const options = { \
    hostname: 'localhost', \
    port: 5000, \
    path: '/health', \
    timeout: 12000, \
    headers: { 'User-Agent': 'ECS-HealthCheck/1.0' } \
    }; \
    const req = http.request(options, (res) => { \
    let data = ''; \
    res.on('data', chunk => data += chunk); \
    res.on('end', () => { \
    const duration = Date.now() - startTime; \
    console.log('🏥 Health check: ' + res.statusCode + ' en ' + duration + 'ms'); \
    console.log('📋 Réponse:', data.substring(0, 200)); \
    process.exit(res.statusCode === 200 ? 0 : 1); \
    }); \
    }); \
    req.on('error', (err) => { \
    const duration = Date.now() - startTime; \
    console.error('❌ Health check failed après ' + duration + 'ms:', err.message); \
    process.exit(1); \
    }); \
    req.on('timeout', () => { \
    console.error('⏰ Health check timeout (15s)'); \
    req.destroy(); \
    process.exit(1); \
    }); \
    req.setTimeout(12000); \
    req.end();"

# Script de démarrage avec logs détaillés
CMD ["sh", "-c", "echo '🚀 [CONTAINER] Démarrage du container...'; \
    echo '📋 [CONTAINER] Variables d\\'environnement:'; \
    echo '   - NODE_ENV:' $NODE_ENV; \
    echo '   - PORT:' $PORT; \
    echo '   - MYSQL_HOST:' $MYSQL_HOST; \
    echo '   - MYSQL_DATABASE:' $MYSQL_DATABASE; \
    echo '   - FRONTEND_URL:' $FRONTEND_URL; \
    echo '🔍 [CONTAINER] Test import app.js...'; \
    node -e 'const app = require(\"./app\"); console.log(\"✅ Import app.js réussi\");' && \
    echo '🎯 [CONTAINER] Lancement de server.js...'; \
    exec node server.js"]