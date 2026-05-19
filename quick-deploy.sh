#!/bin/bash
# Быстрый деплой после успешного тестирования

echo "🚀 Quick deploy to PROD..."

# Синхронизируем только измененные файлы
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude 'venv' \
    --exclude 'build' \
    --exclude '*.log' \
    -e "ssh -i ~/.ssh/prod-deploy" \
    ~/project-manager/backend/ \
    inm@10.221.8.233:~/project-manager/backend/

# Синхронизируем фронтенд сборку
rsync -avz --delete \
    -e "ssh -i ~/.ssh/prod-deploy" \
    ~/project-manager/frontend/build/ \
    inm@10.221.8.233:~/project-manager/frontend/build/

# Перезапускаем сервисы на PROD
ssh -i ~/.ssh/prod-deploy inm@10.221.8.233 << 'ENDSSH'
pm2 restart project-backend
pm2 restart project-frontend
echo "✅ Services restarted"
ENDSSH

echo "✅ Quick deploy complete!"
