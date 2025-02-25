from pathlib import Path
from setuptools import setup

from sphinx_fediverse import version

requirements = (Path(__file__).parent / "requirements.txt").read_text().split()

setup(name='sphinx-fediverse',
    version=version,
    description='Add fediverse comments to your sphinx page',
    author='Olivia Appleton-Crocker',
    author_email='liv@oliviaappleton.com',
    url='https://oliviaappleton.com/sphinx-fediverse/',
    package_dir={"sphinx_fediverse": "."},
    packages=['sphinx_fediverse'],
    install_requires=requirements,
    include_package_data=True,
    package_data={'': ['package.json', 'requirements.txt', '_static/*']},
)