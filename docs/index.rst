.. sphinx-fediverse documentation master file, created by
   sphinx-quickstart on Sat Feb 15 16:51:44 2025.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.

sphinx-fediverse documentation
==============================

For more of my work, please see my `home page <https://oliviaappleton.com/>`__.


.. toctree::
   :maxdepth: 2
   :caption: Contents:

Quick Start Guide
~~~~~~~~~~~~~~~~~

Installation
------------

As of now, we are unpublished. Because of this, you must install using git

.. code:: bash

   pip install git+https://github.com/LivInTheLookingGlass/sphinx-fediverse

Configuration
-------------

There are a few necessary values that you must provide:

.. table::

   ========================  ============================================  ===============================
   Option                    Description                                   Example
   ========================  ============================================  ===============================
   html_baseurl              The host your documentation will be on        https://www.sphinx-doc.org/
   mastodon_username         The username of the account to make posts on  xkcd
   mastodon_instance         The host you're making comments on            botsin.space
   comments_mapping_file     The name of the comments map file             comments_mapping.json (default)
   replace_index_with_slash  True to replace ``/index.html`` with ``/``    True (default)
   enable_post_creation      True to automatically post, False for manual  True (default)
   raise_error_if_no_post    True to raise an error if not post is made    True (default)
   ========================  ============================================  ===============================

We also rely on the following environment variables: ``MASTODON_CLIENT_ID``, ``MASTODON_CLIENT_SECRET``,
``MASTODON_ACCESS_TOKEN``. Each of these must be set if you want to have automatic post creation. They are
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

   .. mastodon-comments::

This will enable a comments section for each post. Upon build, a Mastodon post will be generated for each new page.
This will be stored in the same directory as your config file. The ID of each page's post will be embedded into the
output documents, and used to retrieve comments.

.. warning::

   sphinx-fediverse only works in pure HTML builds. If you produce other builds, you *must* wrap it in an "only" directive

   .. code:: reStructuredText

      .. only:: html

         .. mastodon-comments::

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

.. mastodon-comments::

.. <3
