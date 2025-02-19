from pathlib import Path
import sys

sys.path.append(str(Path(__file__).parent.parent))

from sphinx_fediverse import __version__

# Configuration file for the Sphinx documentation builder.
#
# For the full list of built-in configuration values, see the documentation:
# https://www.sphinx-doc.org/en/master/usage/configuration.html

# -- Project information -----------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#project-information

project = 'sphinx-fediverse'
copyright = '2025, Olivia Appleton-Crocker'
author = 'Olivia Appleton-Crocker'
release = '.'.join(str(x) for x in __version__)

# -- General configuration ---------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#general-configuration

extensions = [
    'sphinx_fediverse',
]

templates_path = ['_templates']
exclude_patterns = ['_build', 'Thumbs.db', '.DS_Store']


# -- Options for HTML output -------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#options-for-html-output

html_theme = 'sphinx_rtd_theme'
html_static_path = ['_static']

mastodon_username = "sphinx-fedi.oliviaappleton.com"
mastodon_instance = "tech.lgbt"
comments_mapping_file = "comments_mapping.json"
html_baseurl = "https://sphinx-fedi.oliviaappleton.com/"  # Set the base URL of your site
replace_index_with_slash = True  # Set to True to replace index.html with a trailing slash
enable_post_creation = False  # Set to False to disable post creation and raise an error if needed
raise_error_if_no_post = True    # Set to True to enable errors if posts are not given
