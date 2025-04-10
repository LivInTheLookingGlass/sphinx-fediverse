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
