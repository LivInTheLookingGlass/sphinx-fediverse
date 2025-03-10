sphinx-fediverse documentation
==============================

For more of my work, please see my `home page <https://oliviaappleton.com/>`__.

.. |downloads| image:: https://img.shields.io/pepy/dt/sphinx-fediverse?link=https%3A%2F%2Fpypi.org%2Fproject%2Fsphinx-fediverse
   :alt: PyPI Total Downloads
.. |license| image:: https://img.shields.io/pypi/l/sphinx-fediverse?link=https%3A%2F%2Fpypi.org%2Fproject%2Fsphinx-fediverse
   :alt: PyPI License
.. |status| image:: https://img.shields.io/pypi/status/sphinx-fediverse?link=https%3A%2F%2Fpypi.org%2Fproject%2Fsphinx-fediverse
   :alt: PyPI Status
.. |version| image:: https://img.shields.io/pypi/v/sphinx-fediverse?link=https%3A%2F%2Fpypi.org%2Fproject%2Fsphinx-fediverse
   :alt: PyPI Version
.. |sponsors| image:: https://img.shields.io/github/sponsors/LivInTheLookingGlass?link=https%3A%2F%2Fgithub.com%2FLivInTheLookingGlass%2Fsphinx-fediverse
   :alt: GitHub Sponsors
.. |issues| image:: https://img.shields.io/github/issues/LivInTheLookingGlass/sphinx-fediverse?link=https%3A%2F%2Fgithub.com%2FLivInTheLookingGlass%2Fsphinx-fediverse
   :alt: Open GitHub Issues
.. |prs| image:: https://img.shields.io/github/issues-pr/LivInTheLookingGlass/sphinx-fediverse?link=https%3A%2F%2Fgithub.com%2FLivInTheLookingGlass%2Fsphinx-fediverse
   :alt: Open GitHub Pull Requests

| |license| |status| |version| |downloads|  
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

There are a few necessary values that you must provide:

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
   ========================  ============================================  ===============================

We also rely on some environment variables.

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

Supported Themes
~~~~~~~~~~~~~~~~

Because this project includes styling, we need to ensure compatibility with each theme individually. To view it in any
officially supported theme, click one of the links below:

- `alabaster </sphinx-fediverse/alabaster/>`_
- `Read the Docs </sphinx-fediverse/sphinx_rtd_theme/>`_
- `shibuya </sphinx-fediverse/shibuya/>`_
- `agogo </sphinx-fediverse/agogo/>`_
- `bizstyle </sphinx-fediverse/bizstyle/>`_
- `classic </sphinx-fediverse/classic/>`_
- `haiku </sphinx-fediverse/haiku/>`_
- `nature </sphinx-fediverse/nature/>`_
- `pyramid </sphinx-fediverse/pyramid/>`_
- `scrolls </sphinx-fediverse/scrolls/>`_
- `sphinxdoc </sphinx-fediverse/sphinxdoc/>`_
- `traditional </sphinx-fediverse/traditional/>`_
