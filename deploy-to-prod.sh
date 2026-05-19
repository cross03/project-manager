#!/bin/bash

# Конфигурация
PROD_HOST="10.221.8.233"
PROD_USER="inm"
PROD_PATH="/home/inm/project-manager"
SSH_KEY="~/.ssh/prod-deploy"
VERSION=$(date +%Y%m%d_%H%M%S)

echo "========================================="
echo "🚀 Deploying to PROD server ($PROD_HOST)"
echo "📦 Version: $VERSION"
echo "========================================="

# 1. Создаем директорию для бэкапов
mkdir -p ~/project-manager-backups

# 2. Собираем фронтенд на DEV
echo "📦 Building frontend..."
cd ~/project-manager/frontend
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed!"
    exit 1
fi

# 3. Создаем архив проекта
echo "📦 Creating deployment archive..."
cd ~/project-manager
tar --exclude='frontend/node_modules' \
    --exclude='backend/venv' \
    --exclude='*.log' \
    --exclude='.git' \
    --exclude='deploy-to-prod.sh' \
    --exclude='install-prod.sh' \
    -czf /tmp/project-manager-$VERSION.tar.gz \
    backend/ \
    frontend/build/ \
    frontend/package.json \
    frontend/package-lock.json \
    VERSIONS.md

# 4. Копируем архив на PROD
echo "📡 Copying to PROD server..."
scp -i $SSH_KEY /tmp/project-manager-$VERSION.tar.gz $PROD_USER@$PROD_HOST:~/

# 5. Создаем установочный скрипт на PROD
echo "🔧 Creating install script for PROD..."
cat > /tmp/install-prod-$VERSION.sh << 'INSTALL'
#!/bin/bash
set -e

VERSION=$1
echo "🔧 Installing version $VERSION on PROD..."

# Останавливаем текущие процессы
pm2 stop all 2>/dev/null || true

# Создаем бэкап старой версии
if [ -d ~/project-manager ]; then
    echo "📦 Creating backup..."
    mv ~/project-manager ~/project-manager-backup-$VERSION
fi

# Распаковываем новую версию
cd ~
tar -xzf project-manager-$VERSION.tar.gz

# Устанавливаем бэкенд
cd ~/project-manager/backend
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn
pip install python-multipart

# Создаем server.py если его нет (копируем из бэкапа или создаем)
if [ ! -f server.py ]; then
    echo "⚠️ Warning: server.py not found, copying from backup if available"
fi

# Запускаем бэкенд
pm2 start "venv/bin/python -m uvicorn server:app --host 0.0.0.0 --port 8000" --name project-backend

# Устанавливаем фронтенд
cd ~/project-manager/frontend
npm install --production
npm install -g serve

# Запускаем фронтенд
pm2 start "serve -s build -l 3000" --name project-frontend

# Сохраняем PM2 конфигурацию
pm2 save
pm2 startup

echo "✅ Deployment complete!"
echo "🌐 Frontend: http://$(curl -s ifconfig.me):3000"
echo "🔧 Backend: http://$(curl -s ifconfig.me):8000"
echo ""
echo "📋 To check status: pm2 status"
echo "📋 To view logs: pm2 logs"
INSTALL

# Копируем установочный скрипт на PROD
scp -i $SSH_KEY /tmp/install-prod-$VERSION.sh $PROD_USER@$PROD_HOST:~/

# 6. Запускаем установку на PROD
echo "🚀 Running installation on PROD..."
ssh -i $SSH_KEY $PROD_USER@$PROD_HOST "chmod +x ~/install-prod-$VERSION.sh && ~/install-prod-$VERSION.sh $VERSION"

# 7. Очистка
rm -f /tmp/project-manager-$VERSION.tar.gz
rm -f /tmp/install-prod-$VERSION.sh

echo ""
echo "========================================="
echo "✅ Deployment to PROD completed!"
echo "========================================="
echo "🌐 Check PROD: http://$PROD_HOST:3000"
echo "🔧 Check backend: http://$PROD_HOST:8000"
echo "========================================="
