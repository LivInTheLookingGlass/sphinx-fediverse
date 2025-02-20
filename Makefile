LINT?=
PY?=python3
USER_FLAG?=--user
PIP?=$(PY) -m pip
MYPY?=true
COV?=false
BLUE=\033[0;34m
NC=\033[0m # No Color
benchmark_flags=--benchmark-min-time=0.05 --benchmark-sort=fullname --benchmark-group-by=fullfunc --benchmark-verbose

ifneq ($(MYPY),true)
LINT=less
endif

ifeq ($(LINT),false)
pytest_args?= -vl
else ifeq ($(LINT),true)
pytest_args?= -vl --mypy --mypy-ignore-missing-imports --isort --flake8 -k 'not test_problem and not test_is_prime and not test_groupwise'
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
	@echo "  $(BLUE)test$(NC)           run through all tests in sequence. Utilizes the pytest test runner infrastructure"
	@echo "  $(BLUE)test_*$(NC)         run through all tests in parallel with the given number of threads. Use auto to allow the test runner to determine it. Utilizes the pytest runner"
	@echo "  $(BLUE)dependencies$(NC)   grabs all dependencies through pip"
	@echo "  $(BLUE)clean$(NC)          clean up any stray files"
	@echo "  $(BLUE)html$(NC)           Generate documentation"

.PHONY: html
html:
	@$(MAKE) -C docs html

.PHONY: test
test: LICENSE dependencies
	@$(PY) -m pytest $(pytest_args) $(benchmark_flags)

.PHONY: test_%
test_%: LICENSE dependencies
	@$(PY) -m pytest $(pytest_args) -d -n$*

.PHONY: dependencies
dependencies:
ifeq ($(MYPY),true)
	@$(PIP) install -r requirements-dev.txt -r docs/requirements.txt $(USER_FLAG) $(PROXY_ARG)
else
	@cat requirements-dev.txt | grep -v "mypy" > .requirements.txt
	@$(PIP) install -r .requirements.txt -r docs/requirements.txt $(USER_FLAG) $(PROXY_ARG)
endif

.PHONY: clean
clean: SHELL := bash
clean:
	@rm -rf {.,*,*/*}/{*.pyc,__pycache__,.mypy_cache,.pytest_cache,.benchmarks} || echo
	@$(MAKE) -C docs clean
