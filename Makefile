LINT?=
PY?=python3
USER_FLAG?=--user
PIP?=$(PY) -m pip
MYPY?=true
COV?=false
BLUE=\033[0;34m
NC=\033[0m # No Color
benchmark_flags?=--benchmark-min-time=0.05 --benchmark-sort=fullname --benchmark-group-by=fullfunc --benchmark-verbose

ifeq ($(COV),true)
MOCHA?=npx nyc --reporter=lcov mocha
else
MOCHA?=npx mocha
endif

ifneq ($(MYPY),true)
LINT=less
endif

ifeq ($(LINT),false)
pytest_args?= -vl
else ifeq ($(LINT),less)
pytest_args?= -vl --isort
else
pytest_args?= -vl --mypy --mypy-ignore-missing-imports --isort --flake8
endif

ifeq ($(COV),true)
pytest_args+= --cov
endif

PROXY_ARG=
ifneq ($(https_proxy), )
PROXY_ARG=--proxy=$(https_proxy)
else ifneq ($(http_proxy), )
PROXY_ARG=--proxy=$(http_proxy)
endif

.PHONY: help
help:
	@echo "  $(BLUE)test$(NC)           run through all tests in sequence. Utilizes the pytest and mocha test runner infrastructures."
	@echo "  $(BLUE)test_*$(NC)         run through all tests in parallel with the given number of threads. Use auto to allow the test runner to determine it. Utilizes the pytest and mocha runners."
	@echo "  $(BLUE)py_test$(NC)        run through all tests in sequence. Utilizes the pytest test runner infrastructures."
	@echo "  $(BLUE)py_test_*$(NC)      run through all tests in parallel with the given number of threads. Use auto to allow the test runner to determine it. Utilizes the pytest runner."
	@echo "  $(BLUE)js_test$(NC)        run through all tests in sequence. Utilizes the mocha test runner infrastructure."
	@echo "  $(BLUE)js_test_*$(NC)      run through all tests in parallel with the given number of threads. Use auto to allow the test runner to determine it. Utilizes the mocha runner."
	@echo "  $(BLUE)js_lint$(NC)        run the javascript linters. Unlike in python, this must be done separately."
	@echo "  $(BLUE)dependencies$(NC)   grabs all dependencies through pip and npm"
	@echo "  $(BLUE)clean$(NC)          clean up any stray files"
	@echo "  $(BLUE)html$(NC)           Generate documentation"
	@echo "  $(BLUE)bundle$(NC)         Rebuild the included javascript files"
	@echo "  $(BLUE)build$(NC)          Generate a distribution version of the python package"
	@echo "  $(BLUE)publish$(NC)        Upload to pypi"

.PHONY: html
html: bundle
	npm install -g jsdoc
	$(MAKE) -C docs html

.PHONY: test
test: js_test py_test

.PHONY: test_%
test_%: js_test_% py_test_%

.PHONY: js_test
js_test: jssrc/LICENSE js_dependencies
	cd jssrc && $(MOCHA)

.PHONY: js_test_%
js_test_%: jssrc/LICENSE js_dependencies
	cd jssrc && $(MOCHA) --parallel -j $*

.PHONY: py_test
py_test: pysrc/LICENSE py_dependencies
	$(PY) -m pytest $(pytest_args) $(benchmark_flags)

.PHONY: py_test_%
py_test_%: pysrc/LICENSE py_dependencies
	$(PY) -m pytest $(pytest_args) -d -n$*

.PHONY: dependencies
dependencies: js_dependencies py_dependencies

.PHONY: js_dependencies
js_dependencies:
ifeq ($(COV),true)
	cd jssrc && npm install nyc
endif
	cd jssrc && npm install --include=dev

.PHONY: py_dependencies
py_dependencies:
	cp jssrc/package.json pysrc/package.json
ifeq ($(MYPY),true)
	$(PIP) install -r pysrc/requirements-dev.txt -r docs/requirements.txt $(USER_FLAG) $(PROXY_ARG)
else
	cat pysrc/requirements-dev.txt | grep -v "mypy" > .requirements.txt
	$(PIP) install -r .requirements.txt -r docs/requirements.txt $(USER_FLAG) $(PROXY_ARG)
	rm .requirements.txt
endif

.PHONY: clean
clean: SHELL := bash
clean:
	rm -rf {.,*,*/*}/{*.pyc,__pycache__,.mypy_cache,.pytest_cache,.benchmarks} pysrc/{_static/*.js,README.rst,package.json,dist,build,*.egg-info} jssrc/node_modules  || echo
	$(MAKE) -C docs clean

pysrc/_static/fedi_scrip%.min.js: jssrc/fedi_scrip%.js dependencies
	cd jssrc && npx babel --no-comments ../$< --out-file ../$@
	VERSION=$$(npx json version -f jssrc/package.json) && \
	LICENSE_COMMENT="/*! license sphinx-fediverse $$VERSION | (c) Olivia Appleton-Crocker & other contributors | Released under the GPLv3 | github.com/LivInTheLookingGlass/sphinx-fediverse/blob/$$VERSION/LICENSE */" && \
	sed -i --follow-symlinks "1i$$LICENSE_COMMENT" $@

bundle: SHELL := bash
bundle: js_dependencies
	$(MAKE) pysrc/_static/fedi_script{,_{mastodon,misskey}}.min.js
	cd jssrc && npx babel ./node_modules/{dompurify/dist/purify,marked/marked}.min.js -d ../pysrc/_static

.PHONY: build
build: clean dependencies bundle
	cp README.rst pysrc/README.rst --reflink=auto
	$(PY) -m build -sw pysrc

.PHONY: publish
publish: build
	$(PY) -m twine upload pysrc/dist/*

.PHONY: js_lint
js_lint: 
	cd jssrc && npx eslint *.js *.mjs --ignore-pattern "dist/*"