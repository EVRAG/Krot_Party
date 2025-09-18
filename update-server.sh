#!/bin/bash
# Скрипт для обновления проекта на сервере

cd /root/Krot_Party
git pull
docker compose up -d --build frontend

echo "Frontend updated with correct API URL"
echo "Check: http://93.115.203.113:5173"
