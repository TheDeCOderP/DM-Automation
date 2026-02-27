
set -e

echo "🚀 Starting deployment..."

# Move to project directory
cd /var/www/dma

# Pull latest changes
echo "📥 Pulling latest changes from git..."
git fetch origin
git reset --hard origin/main

# Ensure pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "📦 Installing pnpm..."
    npm install -g pnpm
fi

# Show versions
echo "📌 Node version: $(node -v)"
echo "📌 pnpm version: $(pnpm -v)"

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build the application
echo "🏗️ Building application..."
pnpm build

# Cleanup any leftover build workers
echo "🧹 Cleaning up build workers..."
pkill -9 -f "jest-worker/processChild.js" || true

# Flush PM2 logs
echo "🧾 Flushing PM2 logs..."
pm2 flush

# Restart PM2 process
echo "🔁 Restarting PM2 process..."
pm2 restart dma-3010 --update-env

echo "✅ Deployment completed successfully!"
