import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from sphinx_fediverse import __version__  # isort: skip

project = 'sphinx-fediverse'
copyright = '2025, Olivia Appleton-Crocker'
author = 'Olivia Appleton-Crocker'
release = '.'.join(str(x) for x in __version__)
rst_prolog = """
.. meta::
    :fediverse:creator: @LivInTheLookingGlass@transfem.social

.. raw:: html

    <a rel="me" href="https://transfem.social/@LivInTheLookingGlass" role="none"
     style="display: none; visibility: hidden; pointer-events: none; animation: none; transition: none"></a>
    <script>
        window.goatcounter = {
            path: function() {
                let p = location.pathname;
                if (p == '/') {
                    p = '/index.html';
                }
                return '/sphinx-fediverse' + p;
            }
        }
    </script>
    <script data-goatcounter="https://livinthelookingglass.goatcounter.com/count"
     async src="//gc.zgo.at/count.js"></script>
"""

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
html_static_path = ['../_static']

# -- Options for sphinx_fediverse --------------------------------------------
# https://oliviaappleton.com/sphinx-fediverse/

fedi_version = 'mastodon'
fedi_username = "LivInTheLookingGlass"
fedi_instance = "tech.lgbt"
comments_mapping_file = "comments_mapping.json"
html_baseurl = "https://oliviaappleton.com/sphinx-fediverse/"  # Set the base URL of your site
replace_index_with_slash = True  # Set to True to replace index.html with a trailing slash
enable_post_creation = True  # Set to False to disable post creation and raise an error if needed
raise_error_if_no_post = True    # Set to True to enable errors if posts are not given
