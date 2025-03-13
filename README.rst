sphinx-fediverse documentation
==============================

For more of my work, please see my `home page <https://oliviaappleton.com/>`__.

.. |downloads| image:: https://img.shields.io/pepy/dt/sphinx-fediverse
   :alt: PyPI Total Downloads
   :target: https://pepy.tech/projects/sphinx-fediverse
.. |license| image:: https://img.shields.io/pypi/l/sphinx-fediverse
   :alt: PyPI License
   :target: https://pypi.org/project/sphinx-fediverse
.. |status| image:: https://img.shields.io/pypi/status/sphinx-fediverse
   :alt: PyPI Status
   :target: https://pypi.org/project/sphinx-fediverse
.. |version| image:: https://img.shields.io/pypi/v/sphinx-fediverse
   :alt: PyPI Version
   :target: https://pypi.org/project/sphinx-fediverse
.. |sponsors| image:: https://img.shields.io/github/sponsors/LivInTheLookingGlass
   :alt: GitHub Sponsors
   :target: https://github.com/LivInTheLookingGlass/sphinx-fediverse
.. |issues| image:: https://img.shields.io/github/issues/LivInTheLookingGlass/sphinx-fediverse
   :alt: Open GitHub Issues
   :target: https://github.com/LivInTheLookingGlass/sphinx-fediverse/issues
.. |prs| image:: https://img.shields.io/github/issues-pr/LivInTheLookingGlass/sphinx-fediverse
   :alt: Open GitHub Pull Requests
   :target: https://github.com/LivInTheLookingGlass/sphinx-fediverse/pulls

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
