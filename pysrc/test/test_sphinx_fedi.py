from __future__ import annotations

from contextlib import contextmanager
from multiprocessing import Process
from pathlib import Path
from sys import path as sys_path
from tempfile import TemporaryDirectory
from textwrap import dedent
from typing import TYPE_CHECKING

from pytest import fail, mark, raises
from sphinx.application import Sphinx

if TYPE_CHECKING:  # cov: ignore
    from typing import Any, Callable, Generator, Tuple

sys_path.append(str(Path(__file__).parent.parent))

conf_prefix = f"""
import sys
sys.path.append({str(Path(__file__).parent.parent)!r})
extensions = ['sphinx_fediverse']
html_baseurl = "http://localhost/"
html_static_path = ['_static']
"""


# we want to run tests in subprocesses because sphinx doesn't clean up until exit
def run_in_subprocess(func: Callable[..., Any]) -> Callable[..., None]:
    def wrapper(*args: Any, **kwargs: Any) -> None:
        proc = Process(target=func, args=args, kwargs=kwargs)
        proc.start()
        proc.join()
        if proc.exitcode != 0:
            fail(f"Test {func.__name__} failed in subprocess with exit code {proc.exitcode}")
    return wrapper


# this reduces the burden of spinning up a new app each time
@contextmanager
def mk_app(conf: str, index: str, builder: str = 'html') -> Generator[Tuple[Sphinx, str], None, None]:
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
    fedi_flavor = 'mastodon'
    """
    index = """
    Title
    -----

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
    Title
    -----

    .. fedi-comments::

    """

    with mk_app("fedi_flavor = 'mastodon'", index, builder='dummy') as (app, tmpdir):
        with raises(EnvironmentError, match="Cannot function outside of html build"):
            app.build(force_all=True)


def test_error_if_no_auth_mastodon() -> None:
    run_in_subprocess(_test_error_if_no_auth_mastodon)()


def _test_error_if_no_auth_mastodon() -> None:
    """Ensure that not providing auth will raise an error."""
    index = """
    Title
    -----

    .. fedi-comments::

    """

    with mk_app("fedi_flavor = 'mastodon'", index) as (app, tmpdir):
        with raises(EnvironmentError, match="Must provide all 3 mastodon access tokens"):
            app.build(force_all=True)


def test_error_if_no_auth_misskey() -> None:
    run_in_subprocess(_test_error_if_no_auth_misskey)()


def _test_error_if_no_auth_misskey() -> None:
    """Ensure that not providing auth will raise an error."""
    index = """
    Title
    -----

    .. fedi-comments::

    """

    with mk_app("fedi_flavor = 'misskey'", index) as (app, tmpdir):
        with raises(EnvironmentError, match="Must provide misskey access token"):
            app.build(force_all=True)


def test_error_if_no_baseurl() -> None:
    run_in_subprocess(_test_error_if_no_baseurl)()


def _test_error_if_no_baseurl() -> None:
    """Ensure that not providing html_baseurl will raise an error."""

    with mk_app("html_baseurl = ''", ".. fedi-comments::\n") as (app, tmpdir):
        with raises(ValueError, match="html_baseurl must be set in conf.py for Fediverse comments to work."):
            app.build(force_all=True)
