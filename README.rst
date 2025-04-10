sphinx-fediverse documentation
==============================

For more of my work, please see my `home page <https://oliviaappleton.com/>`__. For a detailed description of how this
works, see `this blog post <https://blog.oliviaappleton.com/posts/0005-sphinx-fediverse>`__

.. |downloads| image:: https://img.shields.io/pepy/dt/sphinx-fediverse?label=Downloads
   :alt: PyPI Total Downloads
   :target: https://pepy.tech/projects/sphinx-fediverse
.. |license| image:: https://img.shields.io/pypi/l/sphinx-fediverse?label=License
   :alt: PyPI License
   :target: https://pypi.org/project/sphinx-fediverse
.. |status| image:: https://img.shields.io/pypi/status/sphinx-fediverse?label=Status
   :alt: PyPI Status
   :target: https://pypi.org/project/sphinx-fediverse
.. |version| image:: https://img.shields.io/pypi/v/sphinx-fediverse?label=PyPi
   :alt: PyPI Version
   :target: https://pypi.org/project/sphinx-fediverse
.. |sponsors| image:: https://img.shields.io/github/sponsors/LivInTheLookingGlass?label=Sponsors
   :alt: GitHub Sponsors
   :target: https://github.com/LivInTheLookingGlass/sphinx-fediverse
.. |issues| image:: https://img.shields.io/github/issues/LivInTheLookingGlass/sphinx-fediverse?label=Issues
   :alt: Open GitHub Issues
   :target: https://github.com/LivInTheLookingGlass/sphinx-fediverse/issues
.. |prs| image:: https://img.shields.io/github/issues-pr/LivInTheLookingGlass/sphinx-fediverse?label=Pull%20Requests
   :alt: Open GitHub Pull Requests
   :target: https://github.com/LivInTheLookingGlass/sphinx-fediverse/pulls
.. |python| image:: https://img.shields.io/github/actions/workflow/status/LivInTheLookingGlass/sphinx-fediverse/python.yml?label=Py%20Tests
   :alt: GitHub Actions Workflow Status (Python)
   :target: https://github.com/LivInTheLookingGlass/sphinx-fediverse/actions/workflows/python.yml
.. |javascript| image:: https://img.shields.io/github/actions/workflow/status/LivInTheLookingGlass/sphinx-fediverse/javascript.yml?label=JS%20Tests
   :alt: GitHub Actions Workflow Status (JavaScript)
   :target: https://github.com/LivInTheLookingGlass/sphinx-fediverse/actions/workflows/javascript.yml
.. |python-lint| image:: https://img.shields.io/github/actions/workflow/status/LivInTheLookingGlass/sphinx-fediverse/python-lint.yml?label=Py%20Lint
   :alt: GitHub Actions Workflow Status (Python Lint)
   :target: https://github.com/LivInTheLookingGlass/sphinx-fediverse/actions/workflows/python-lint.yml
.. |javascript-lint| image:: https://img.shields.io/github/actions/workflow/status/LivInTheLookingGlass/sphinx-fediverse/eslint.yml?label=JS%20Lint
   :alt: GitHub Actions Workflow Status (JavaScript Lint)
   :target: https://github.com/LivInTheLookingGlass/sphinx-fediverse/actions/workflows/eslint.yml
.. |codecov| image:: https://img.shields.io/codecov/c/github/LivInTheLookingGlass/sphinx-fediverse?label=Coverage
   :alt: Code Coverage (Overall)
   :target: https://app.codecov.io/gh/LivInTheLookingGlass/sphinx-fediverse/tree/main/
.. |codecov-py| image:: https://img.shields.io/codecov/c/github/LivInTheLookingGlass/sphinx-fediverse?flag=Python&label=Coverage%20(Py)
   :alt: Code Coverage (Python)
   :target: https://app.codecov.io/gh/LivInTheLookingGlass/sphinx-fediverse/tree/main?flags%5B0%5D=Python
.. |codecov-js| image:: https://img.shields.io/codecov/c/github/LivInTheLookingGlass/sphinx-fediverse?flag=JavaScript&label=Coverage%20(JS)
   :alt: Code Coverage (JavaScript)
   :target: https://app.codecov.io/gh/LivInTheLookingGlass/sphinx-fediverse/tree/main?flags%5B0%5D=JavaScript

| |license| |status| |version| |downloads|
| |python| |javascript| |python-lint| |javascript-lint|
| |codecov| |codecov-py| |codecov-js|
| |issues| |prs| |sponsors|

.. first-cut

Quick Start Guide
~~~~~~~~~~~~~~~~~

Installation
------------

.. code:: bash

   pip install sphinx-fediverse

Configuration
-------------

There are a several values that you may provide:

.. table::

   ========================  ============================================  ===============================
   Option                    Description                                   Example
   ========================  ============================================  ===============================
   html_baseurl              The host your documentation will be on        https://www.sphinx-doc.org/
   fedi_flavor               The API your server implements                ``'mastodon'`` or ``'misskey'``
   fedi_username             The username of the account to make posts on  xkcd
   fedi_instance             The host you're making comments on            botsin.space
   comments_mapping_file     The name of the comments map file             comments_mapping.json (default)
   replace_index_with_slash  True to replace ``/index.html`` with ``/``    True (default)
   enable_post_creation      True to automatically post, False for manual  True (default)
   raise_error_if_no_post    True to raise an error if not post is made    True (default)
   comment_fetch_depth       The number of recursive fetches to make       5 (default)
   comment_section_level     The header level of the comments section      2 (default)
   comment_section_title     The title of the comments section             Comments (default)
   ========================  ============================================  ===============================

We also rely on environment variables for authentication.

For Mastodon instances we require: ``MASTODON_CLIENT_ID``, ``MASTODON_CLIENT_SECRET``, ``MASTODON_ACCESS_TOKEN``.

For Misskey instances we require: ``MISSKEY_ACCESS_TOKEN``.

Each of these must be set if you want to have automatic post creation. They are
intentionally not included in the config file so you are incentivized to not store them publicly.

Usage
-----

To use this extension, simply add it to your ``conf.py``'s extension list:

.. code:: python

   extensions = [
      # ...
      'sphinx_fediverse',
   ]

And add the following to each page you want a comments section to appear in:

.. code:: reStructuredText

   .. fedi-comments::

This will enable a comments section for each post. Upon build, a Mastodon post will be generated for each new page.
This will be stored in the same directory as your config file. The ID of each page's post will be embedded into the
output documents, and used to retrieve comments.

.. warning::

   sphinx-fediverse only works in pure HTML builds. If you produce other builds, you *must* wrap it in an "only" directive

   .. code:: reStructuredText

      .. only:: html

         .. fedi-comments::

Directive Options
-----------------

.. note::

   This feature is a work in progress

In addition to the above configuration values, you can modify most of them on a per-directive basis!

.. table::

   ========================  ============================================  ==================================
   Option                    Description                                   Example(s)
   ========================  ============================================  ==================================
   fedi_flavor               (See Above)                                   (See Above)
   fedi_username             (See Above)                                   (See Above)
   fedi_instance             (See Above)                                   (See Above)
   comments_mapping_file     (See Above)                                   (See Above)
   replace_index_with_slash  (See Above)                                   (See Above)
   enable_post_creation      (See Above)                                   (See Above)
   raise_error_if_no_post    (See Above)                                   (See Above)
   fetch_depth               (See comment_fetch_depth Above)               (See Above)
   section_level             (See comment_section_level Above)             (See Above)
   section_title             (See comment_section_title Above)             (See Above)
   post_id                   A hardcoded post ID to use for comments       None (default), 114032235423688612
   ========================  ============================================  ==================================

Supported Themes
~~~~~~~~~~~~~~~~

Because this project includes styling, we need to ensure compatibility with each theme individually. To view it in any
officially supported theme, click one of the links below:

- `alabaster <https://sphinx-fediverse.oliviaappleton.com/alabaster/>`_
- `Read the Docs <https://sphinx-fediverse.oliviaappleton.com/sphinx_rtd_theme/>`_
- `shibuya <https://sphinx-fediverse.oliviaappleton.com/shibuya/>`_
- `agogo <https://sphinx-fediverse.oliviaappleton.com/agogo/>`_
- `bizstyle <https://sphinx-fediverse.oliviaappleton.com/bizstyle/>`_
- `classic <https://sphinx-fediverse.oliviaappleton.com/classic/>`_
- `haiku <https://sphinx-fediverse.oliviaappleton.com/haiku/>`_
- `nature <https://sphinx-fediverse.oliviaappleton.com/nature/>`_
- `pyramid <https://sphinx-fediverse.oliviaappleton.com/pyramid/>`_
- `scrolls <https://sphinx-fediverse.oliviaappleton.com/scrolls/>`_
- `sphinxdoc <https://sphinx-fediverse.oliviaappleton.com/sphinxdoc/>`_
- `traditional <https://sphinx-fediverse.oliviaappleton.com/traditional/>`_

Dependencies
~~~~~~~~~~~~

JavaScript
----------

Note that by using this plugin, you will be including the following in your page:

- `Marked <https://marked.js.org/>`_ for rendering Markdown (Misskey only)
- `DOMPurify <https://github.com/cure53/DOMPurify>`_ for HTML sanitization

We also use `Babel <https://babeljs.io/>`_ to ensure compatibility with most browsers. This is not included directly,
but is used to pre-process the included javascript before release.

Python
------

In the Python stack, you will be utilizing the following:

- `Sphinx <https://www.sphinx-doc.org/>`_
- `docutils <https://docutils.sourceforge.io/>`_
- At least one of: `Mastodon.py <https://github.com/halcy/Mastodon.py>`_, `Misskey.py <https://github.com/YuzuRyo61/Misskey.py>`_

Contributing
~~~~~~~~~~~~

Contributions are welcome from anyone interested! The build process is a little complicated, though, so this section is
going to walk you through it. For starters, there is a number of ``make`` recipes that you may find useful.

Pull requests are always welcome, especially (but not only) if they address an open issue.

.. highlight:: make

Variables
---------

The following variables can be overridden to affect the build process

.. make:var:: PY

   Holds the name of the python executable. Defaults to ``python3``

.. make:var:: PIP

   Holds the name of the pip executable. Defaults to ``$(PY) -m pip``

.. make:var:: MOCHA

   Holds the name of the mocha executable. Defaults to ``npx mocha`` *unless* coverage is enabled, in which case it
   changes to ``npx nyc --reporter=lcov mocha``

.. make:var:: COV

   Controls whether the python and mocha test runners collect code coverage. Set to ``true`` or ``false``. Defaults to
   ``true``.

.. make:var:: LINT

   Controls how much python linting is done. ``less`` will enable only ``mypy``. Otherwise set to ``true`` or
   ``false``. Defaults to ``true`` if mypy is disabled, otherwise ``less``.

.. make:var:: MYPY

   Controls whether mypy type checking is done. Set to ``true`` or ``false``. Defaults to ``true``.

.. make:var:: benchmark_flags

   Can be used to override the benchmark-specific arguments to the python test runner. I recommend you don't touch it.

.. make:var:: pytest_args

   Can be used to override the automatically-generated pytest arguments. I recommend you don't touch it.

Build
-----

.. make:target:: clean

   Removes any stray build files, and also javascript dependencies.

.. make:target:: dependencies: js_dependencies py_dependencies

   Grab all project dependencies.

.. make:target:: py_dependencies

   Grab python project dependencies.

.. make:target:: js_dependencies

   Grab javascript project dependencies.

.. make:target:: html: bundle

   Generates the HTML documentation

.. make:target:: pysrc/_static/fedi_scrip%.min.js: dependencies

   This should not be called individually, but these recipes process the javascript found in ``jssrc`` through Babel
   and prepend the license to them.

.. make:target:: bundle: js_dependencies

   Moves all javascript and dependencies into the python static directory for use and packaging purposes

.. make:target:: build: clean dependencies bundle

   Builds a distribution version of the python package.

.. make:target:: publish: build

   Provided you have the proper token, uploads the built package to PyPi.

Tests
-----

.. make:target:: test: js_test py_test

   Run through all tests in sequence. Utilizes the pytest and mocha test runner infrastructures
   
.. make:target:: test_%: js_test_% py_test_%

   Run through all tests in parallel with the given number of threads. Use auto to allow the test runner to determine
   it. Utilizes the pytest and mocha runners.

.. make:target:: py_test

   Run through all tests in sequence. Utilizes the pytest test runner infrastructures.

.. make:target:: py_test_%

   Run through all tests in parallel with the given number of threads. Use auto to allow the test runner to determine
   it. Utilizes the pytest runner.

.. make:target:: js_test

   Run through all tests in sequence. Utilizes the mocha test runner infrastructure.

.. make:target:: js_test_%

   Run through all tests in parallel with the given number of threads. Use auto to allow the test runner to determine
   it. Utilizes the mocha runner.

.. make:target:: js_lint

   Run the javascript linters. Unlike in python, this must be done separately.
   
