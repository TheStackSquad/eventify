#!/bin/bash
# Build script for Eventify frontend Docker image

echo "🏗️  Building Eventify Frontend Docker Image..."

# Read Paystack key from .env.local
PAYSTACK_KEY=$(grep "NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY" .env.local | cut -d '=' -f2 | tr -d '"')

docker build \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:8081 \
  --build-arg NEXT_PUBLIC_SITE_URL=http://localhost:3000 \
  --build-arg NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY="$PAYSTACK_KEY" \
  --build-arg NEXT_PUBLIC_SERVICE_FEE=500 \
  --build-arg NEXT_PUBLIC_VAT_RATE=0.075 \
  -t eventify-frontend:v1 \
  -f Dockerfile \
  .

echo "✅ Build complete!"
echo ""
echo "To run the container:"
echo "docker run -d --name eventify-frontend --network eventify-network -p 3000:3000 eventify-frontend:v1"
