#!/bin/bash
set -e

echo "🚀 Atualizando repositório do Kart..."
cd /var/www/kart

git pull origin main

echo "📦 Instalando dependências..."
npm install

echo "🔨 Compilando aplicação..."
npm run build

echo "🔄 Reiniciando processo no PM2..."
pm2 restart kart-loja || pm2 start deploy/ecosystem.config.cjs
pm2 save

echo "✅ Deploy atualizado com sucesso na porta 3009!"
