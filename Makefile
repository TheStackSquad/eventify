# Eventify Docker Management
# Quick commands for Docker operations

.PHONY: help start stop restart logs clean build status shell test

# Default target
help:
	@echo "🎉 Eventify Docker Commands"
	@echo ""
	@echo "Production:"
	@echo "  make start      - Start all services"
	@echo "  make stop       - Stop all services"
	@echo "  make restart    - Restart all services"
	@echo "  make logs       - View all logs"
	@echo "  make status     - Show container status"
	@echo ""
	@echo "Development:"
	@echo "  make dev        - Start in development mode (hot reload)"
	@echo "  make dev-stop   - Stop development containers"
	@echo ""
	@echo "Maintenance:"
	@echo "  make build      - Rebuild all images"
	@echo "  make clean      - Remove containers (keep data)"
	@echo "  make reset      - Full reset (removes data too)"
	@echo ""
	@echo "Utilities:"
	@echo "  make shell-backend   - Open shell in backend container"
	@echo "  make shell-frontend  - Open shell in frontend container"
	@echo "  make shell-db        - Open PostgreSQL shell"
	@echo "  make backup-db       - Backup database"
	@echo ""

# Production commands
start:
	@echo "🚀 Starting Eventify..."
	docker-compose up -d
	@echo "✅ Services started!"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend: http://localhost:8081"

stop:
	@echo "🛑 Stopping Eventify..."
	docker-compose down
	@echo "✅ Services stopped"

restart:
	@echo "🔄 Restarting Eventify..."
	docker-compose restart
	@echo "✅ Services restarted"

logs:
	docker-compose logs -f

status:
	@echo "📊 Container Status:"
	docker-compose ps

# Development commands
dev:
	@echo "🔧 Starting Eventify in development mode..."
	docker-compose -f docker-compose.dev.yml up

dev-stop:
	@echo "🛑 Stopping development containers..."
	docker-compose -f docker-compose.dev.yml down

# Build commands
build:
	@echo "🏗️  Rebuilding all services..."
	docker-compose build --no-cache
	@echo "✅ Build complete"

rebuild: stop build start

# Clean commands
clean:
	@echo "🧹 Cleaning up containers..."
	docker-compose down
	@echo "✅ Cleanup complete (data preserved)"

reset:
	@echo "⚠️  FULL RESET - This will delete all data!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		docker system prune -f; \
		echo "✅ Full reset complete"; \
	fi

# Shell access
shell-backend:
	docker-compose exec backend sh

shell-frontend:
	docker-compose exec frontend sh

shell-db:
	docker-compose exec postgres psql -U astronautdesh -d Eventify

# Database operations
backup-db:
	@echo "💾 Backing up database..."
	@mkdir -p backups
	docker-compose exec -T postgres pg_dump -U astronautdesh Eventify > backups/eventify_backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "✅ Backup saved to backups/"

restore-db:
	@echo "⚠️  This will overwrite the current database!"
	@read -p "Backup file name: " file; \
	docker-compose exec -T postgres psql -U astronautdesh Eventify < backups/$$file
	@echo "✅ Database restored"

# Quick test
test:
	@echo "🧪 Testing services..."
	@curl -s http://localhost:8081/health | grep -q "ok" && echo "✅ Backend OK" || echo "❌ Backend Failed"
	@curl -s http://localhost:3000 > /dev/null && echo "✅ Frontend OK" || echo "❌ Frontend Failed"




	# Go Tests Command 
	go test -p 1 ./pkg/models/... ./pkg/repository/vendor/... ./pkg/repository/subscription/... ./pkg/services/vendor/...
	