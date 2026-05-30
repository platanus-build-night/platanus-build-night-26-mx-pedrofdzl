.PHONY: lint format fix check run migrate makemigrations shell test

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

migrate:  ## Apply migrations
	uv run python manage.py migrate

makemigrations:  ## Create migrations
	uv run python manage.py makemigrations

shell:  ## Django shell
	uv run python manage.py shell

test:  ## Run tests
	uv run python manage.py test
