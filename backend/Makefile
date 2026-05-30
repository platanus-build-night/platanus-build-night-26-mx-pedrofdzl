.PHONY: lint format fix check run worker beat dev migrate makemigrations shell test

lint:  ## Lint with ruff
	uv run ruff check .

format:  ## Format with ruff
	uv run ruff format .

fix:  ## Auto-fix lint issues + format
	uv run ruff check --fix .
	uv run ruff format .

check:  ## Django system check
	uv run python manage.py check

run:  ## Run dev server
	uv run python manage.py runserver

worker:  ## Run celery worker
	uv run celery -A ditto worker -l info

beat:  ## Run celery beat scheduler
	uv run celery -A ditto beat -l info

dev:  ## Run web server + celery worker + beat together (Ctrl-C stops all)
	@trap 'kill 0' EXIT; \
	uv run python manage.py runserver & \
	uv run celery -A ditto worker -l info & \
	uv run celery -A ditto beat -l info & \
	wait

migrate:  ## Apply migrations
	uv run python manage.py migrate

makemigrations:  ## Create migrations
	uv run python manage.py makemigrations

shell:  ## Django shell
	uv run python manage.py shell

test:  ## Run tests
	uv run python manage.py test
