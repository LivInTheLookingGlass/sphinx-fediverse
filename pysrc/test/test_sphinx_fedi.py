from contextlib import contextmanager
from multiprocessing import Process
from pathlib import Path
from sys import path as sys_path
from tempfile import TemporaryDirectory
from textwrap import dedent

from pytest import fail, mark, raises
from sphinx.application import Sphinx
from sphinx.testing.fixtures import *

sys_path.append(str(Path(__file__).parent.parent))

conf_prefix = f"""
import sys
sys.path.append({str(Path(__file__).parent.parent)!r})
extensions = ['sphinx_fediverse']
html_baseurl = "http://localhost/"
html_static_path = ['_static']
"""


# we want to run tests in subprocesses because sphinx doesn't clean up until exit
def run_in_subprocess(func):
    def wrapper(*args, **kwargs):
        proc = Process(target=func, args=args, kwargs=kwargs)
        proc.start()
        proc.join()
        if proc.exitcode != 0:
            fail(f"Test {func.__name__} failed in subprocess with exit code {proc.exitcode}")
    return wrapper


# this reduces the burden of spinning up a new app each time
@contextmanager
def mk_app(conf, index, builder='html'):
    with TemporaryDirectory() as tmpdir:
        tmpdir_path = Path(tmpdir)
        srcdir = tmpdir_path / "source"
        confdir = srcdir
        outdir = tmpdir_path / "build"
        doctreedir = tmpdir_path / "doctree"

        srcdir.mkdir()
        (srcdir / "index.rst").write_text(dedent(index))
        (srcdir / "conf.py").write_text(dedent(conf_prefix) + '\n' + dedent(conf))
        (srcdir / '_static').mkdir(parents=True, exist_ok=True)

        app = Sphinx(
            srcdir=srcdir,
            confdir=confdir,
            outdir=outdir,
            doctreedir=doctreedir,
            buildername=builder,
            warningiserror=True,
        )
        yield app, tmpdir


# testing in Windows environments requires you to separate it like this
def test_directive_fails_on_multiple_usage() -> None:
    run_in_subprocess(_test_directive_fails_on_multiple_usage)()


def _test_directive_fails_on_multiple_usage() -> None:
    """Ensure that using the directive twice raises an error."""
    conf = """
    enable_post_creation = False
    raise_error_if_no_post = False
    """
    index = """
    .. fedi-comments::

    .. fedi-comments::

    """

    with mk_app(conf, index) as (app, tmpdir):
        with raises(RuntimeError, match="Cannot include two comments sections in one document"):
            app.build()


@mark.parametrize("builder_name", ["dummy", "epub", "latex"])
def test_directive_fails_on_non_html(builder_name: str) -> None:
    run_in_subprocess(_test_directive_fails_on_non_html)(builder_name)


def _test_directive_fails_on_non_html(builder_name: str) -> None:
    """Ensure that using the a builder other than html raises an error."""
    index = """
    .. fedi-comments::

    """

    with mk_app("", index, builder='dummy') as (app, tmpdir):
        with raises(EnvironmentError, match="Cannot function outside of html build"):
            app.build(force_all=True)


def test_error_if_no_auth() -> None:
    run_in_subprocess(_test_error_if_no_auth)()


def _test_error_if_no_auth() -> None:
    """Ensure that not providing auth will raise an error."""
    index = """
    .. fedi-comments::

    """

    with mk_app("", index) as (app, tmpdir):
        with raises(EnvironmentError, match="Must provide all 3 mastodon access tokens"):
            app.build(force_all=True)
