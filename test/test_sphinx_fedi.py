from contextlib import contextmanager
from pathlib import Path
from sys import path as sys_path
from tempfile import TemporaryDirectory
from textwrap import dedent
from typing import Tuple

import pytest

from sphinx.testing.util import SphinxTestApp
from sphinx.testing.fixtures import *

sys_path.append(str(Path(__file__).parent.parent))

conf_prefix = f"""
import sys
sys.path.append({str(Path(__file__).parent.parent)!r})
extensions = ['sphinx_fediverse']
html_baseurl = "http://localhost/"
html_static_path = ['_static']
"""


@contextmanager
def mk_app(conf, index, builder='html'):
    with TemporaryDirectory() as tmpdir:
        tmpdir_path = Path(tmpdir)
        srcdir = tmpdir_path / "source"
        confdir = srcdir
        outdir = tmpdir_path / "build"
        doctreedir = tmpdir_path / "doctree"

        # Create necessary directories
        srcdir.mkdir()

        # Write the index.rst file with the directive used twice
        (srcdir / "index.rst").write_text(dedent(index))

        # Write a minimal conf.py
        (srcdir / "conf.py").write_text(dedent(conf_prefix + '\n' + conf))
        (srcdir / '_static').mkdir(parents=True, exist_ok=True)

        # Initialize the Sphinx application
        app = SphinxTestApp(
            srcdir=srcdir,
            confdir=confdir,
            outdir=outdir,
            doctreedir=doctreedir,
            buildername='html',
            warningiserror=True,
        )
        yield app, tmpdir


@pytest.mark.sphinx("html")
def test_directive_fails_on_multiple_usage():
    """Ensure that using the directive twice raises an error."""
    conf = "raise_error_if_no_post = False"
    index = """
    .. mastodon-comments::

    .. mastodon-comments::
    """

    with mk_app(conf, index) as (app, tmpdir):
        with pytest.raises(RuntimeError, match="Cannot include two comments sections in one document"):
            app.build()


@pytest.mark.sphinx(confoverrides={'extensions': ['sphinx_fediverse']})
def test_directive_fails_on_non_html(app: SphinxTestApp):
    """Ensure that using the a builder other than html raises an error."""
    with pytest.raises(EnvironmentError, match="Cannot function outside of html build"):
        app.build(force_all=True)
