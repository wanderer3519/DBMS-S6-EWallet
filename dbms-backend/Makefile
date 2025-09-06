run:
	uvicorn api.main:app --reload

activate-env:
	source venv/bin/activate

install-dep: activate-env
	poetry install --no-root

clean:
	rm -rf __pycache__/

populate:
	python3 -m scripts.populate_db
	python3 -m scripts.populate_products

lint: activate-env install-dep
	ruff check --fix
	ruff format
