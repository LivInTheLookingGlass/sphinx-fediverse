# Minimal makefile for Sphinx documentation
#

# You can set these variables from the command line, and also
# from the environment for the first two.
SPHINXOPTS    ?=
SPHINXBUILD   ?= sphinx-build
SOURCEDIR     = .
BUILDDIR      = _build
THEMES = alabaster agogo bizstyle classic haiku nature pyramid scrolls sphinxdoc traditional # sphinx_rtd_theme shibuya

# Put it first so that "make" without argument is like "make help".
help:
	@$(SPHINXBUILD) -M help "$(SOURCEDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)

.PHONY: help Makefile

clean:
	rm -r $(BUILDDIR)

$(THEMES):
	@echo "Building theme: $@"
	mkdir -p "$(BUILDDIR)/html/$@"
	sphinx-build -b html -D html_theme=$@ -D html_baseurl="http://oliviaappleton.com/sphinx-fediverse/$@" "$(SOURCEDIR)" "$(BUILDDIR)/html/$@"

# Catch-all target: route all unknown targets to Sphinx using the new
# "make mode" option.  $(O) is meant as a shortcut for $(SPHINXOPTS).
html: Makefile $(THEMES)
	@$(SPHINXBUILD) -M html "$(SOURCEDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)
