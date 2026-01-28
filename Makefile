.PHONY: install build dev lint format test clean check

install:
	npm install

build:
	npm run build

dev:
	npm run dev

lint:
	npm run lint

format:
	npm run format

format:check:
	npm run format:check

check:
	npm run check

test:
	npm run test

clean:
	rm -rf dist node_modules