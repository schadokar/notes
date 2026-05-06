.PHONY: dev build preview sync install clean git-push

MSG ?= update

dev:
	npm run dev

build:
	npm run build

preview:
	npm run preview

sync:
	npm run sync

install:
	npm install

clean:
	rm -rf dist node_modules/.cache

git-push:
	npm run build
	git add .
	git commit -m "$(MSG)"
	git push

