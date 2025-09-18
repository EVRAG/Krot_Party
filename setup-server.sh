#!/bin/bash
# Полная настройка сервера для проекта Krot_Party

set -e

echo "🚀 Начинаем настройку сервера..."

# Обновляем систему
echo "📦 Обновляем систему..."
apt-get update
apt-get upgrade -y

# Устанавливаем необходимые пакеты
echo "🔧 Устанавливаем необходимые пакеты..."
apt-get install -y curl wget git ufw

# Устанавливаем Docker
echo "🐳 Устанавливаем Docker..."
curl -fsSL https://get.docker.com | sh
usermod -aG docker root

# Устанавливаем Docker Compose
echo "🔧 Устанавливаем Docker Compose..."
apt-get install -y docker-compose-plugin

# Запускаем Docker
echo "▶️ Запускаем Docker..."
systemctl start docker
systemctl enable docker

# Настраиваем фаервол
echo "🔥 Настраиваем фаервол..."
ufw --force enable
ufw allow 22/tcp    # SSH
ufw allow 4000/tcp  # Backend API
ufw allow 5173/tcp  # Frontend
ufw allow 5678/tcp  # n8n

# Клонируем проект
echo "📥 Клонируем проект..."
cd /root
if [ -d "Krot_Party" ]; then
    rm -rf Krot_Party
fi
git clone https://github.com/EVRAG/Krot_Party.git
cd Krot_Party

# Создаем Dockerfile'ы если их нет
echo "📝 Создаем Dockerfile'ы..."

# Backend Dockerfile
cat > backend/Dockerfile << 'EOF'
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY src ./src
ENV NODE_ENV=production
EXPOSE 4000
CMD ["npm", "start"]
EOF

# Frontend Dockerfile
cat > frontend/Dockerfile << 'EOF'
# Build stage
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

# Запускаем проект
echo "🚀 Запускаем проект..."
docker compose up -d --build

# Проверяем статус
echo "✅ Проверяем статус контейнеров..."
docker compose ps

echo ""
echo "🎉 Настройка завершена!"
echo ""
echo "📱 Доступные сервисы:"
echo "   Frontend:  http://$(curl -s ifconfig.me):5173"
echo "   Backend:   http://$(curl -s ifconfig.me):4000"
echo "   n8n:       http://$(curl -s ifconfig.me):5678"
echo ""
echo "🔧 Полезные команды:"
echo "   docker compose ps          - статус контейнеров"
echo "   docker compose logs        - логи"
echo "   docker compose restart     - перезапуск"
echo "   docker compose down        - остановка"
echo ""
