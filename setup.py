from pathlib import Path
from setuptools import setup

from sphinx_fediverse import version

requirements = (Path(__file__).parent / "requirements.txt").read_text().split()
long_description = (Path(__file__).parent / "README.rst").read_text()

if __name__ == '__main__':
    setup(name='sphinx-fediverse',
        version=version,
        description='Add fediverse comments to your sphinx page',
        long_description=long_description,
        long_description_content_type="text/x-rst",
        author='Olivia Appleton-Crocker',
        author_email='liv@oliviaappleton.com',
        url='https://sphinx-fediverse.oliviaappleton.com',
        project_urls={  # Useful additional links
            "Documentation": "https://sphinx-fediverse.oliviaappleton.com",
            "Source Code": "https://github.com/LivInTheLookingGlass/sphinx-fediverse",
            "Issue Tracker": "https://github.com/LivInTheLookingGlass/sphinx-fediverse/issues",
        },
        package_dir={"sphinx_fediverse": "."},
        packages=['sphinx_fediverse'],
        install_requires=requirements,
        license_files = ['LICENSE'],
        include_package_data=True,
        package_data={'': ['package.json', 'requirements.txt', '_static/*']},
        keywords="sphinx fediverse comments activitypub mastodon",
        python_requires=">=3.6",
        classifiers=[
            "Development Status :: 4 - Beta",
            "Environment :: Console",
            "Environment :: Plugins",
            "Environment :: Web Environment",
            "Framework :: Sphinx",
            "Framework :: Sphinx :: Extension",
            "Intended Audience :: Developers",
            "License :: OSI Approved :: GNU General Public License v3 (GPLv3)",
            "Programming Language :: JavaScript",
            # "Programming Language :: PHP",
            "Programming Language :: Python :: 3",
            "Programming Language :: Python :: 3.6",
            "Programming Language :: Python :: 3.7",
            "Programming Language :: Python :: 3.8",
            "Programming Language :: Python :: 3.9",
            "Programming Language :: Python :: 3.10",
            "Programming Language :: Python :: 3.11",
            "Programming Language :: Python :: 3.12",
            "Programming Language :: Python :: 3.13",
            "Topic :: Communications",
            "Topic :: Documentation",
            "Topic :: Documentation :: Sphinx",
            "Topic :: Internet",
            "Topic :: Internet :: WWW/HTTP :: Dynamic Content",
            "Topic :: Software Development :: Documentation",
        ],
    )
