#!/bin/bash
set -e
echo "🚀 Iniciando deploy do Flow..."
IMAGE="127.0.0.1:5000/flow:latest"
SERVICE="flow_test"
DIR="/opt/sites/flow"

echo "🧹 Limpando cache e imagens antigas..."
docker system prune -af --filter "until=24h"

echo "📦 Atualizando codigo..."
cd $DIR
git pull origin main

echo "🔨 Buildando imagem..."
docker build -t $IMAGE .

echo "📤 Push para registry..."
docker push $IMAGE

echo "🔄 Atualizando servico..."
docker service update --image $IMAGE --force $SERVICE

echo "✅ Verificando..."
sleep 10
docker service ps $SERVICE --filter "desired-state=running"
