sphinx-fediverse documentation
==============================

For more of my work, please see my `home page <https://oliviaappleton.com/>`__. For a detailed description of how this
works, see `this blog post <https://blog.oliviaappleton.com/posts/0005-sphinx-fediverse>`__

.. |downloads| image:: https://img.shields.io/pepy/dt/sphinx-fediverse?label=Downloads
   :alt: PyPI Total Downloads
   :target: https://pepy.tech/projects/sphinx-fediverse
.. |license| image:: https://img.shields.io/pypi/l/sphinx-fediverse?label=License
   :alt: PyPI License
   :target: https://pypi.org/project/sphinx-fediverse
.. |status| image:: https://img.shields.io/pypi/status/sphinx-fediverse?label=Status
   :alt: PyPI Status
   :target: https://pypi.org/project/sphinx-fediverse
.. |version| image:: https://img.shields.io/pypi/v/sphinx-fediverse?label=PyPi
   :alt: PyPI Version
   :target: https://pypi.org/project/sphinx-fediverse
.. |sponsors| image:: https://img.shields.io/github/sponsors/LivInTheLookingGlass?label=Sponsors
   :alt: GitHub Sponsors
   :target: https://github.com/LivInTheLookingGlass/sphinx-fediverse
.. |issues| image:: https://img.shields.io/github/issues/LivInTheLookingGlass/sphinx-fediverse?label=Issues
   :alt: Open GitHub Issues
   :target: https://github.com/LivInTheLookingGlass/sphinx-fediverse/issues
.. |prs| image:: https://img.shields.io/github/issues-pr/LivInTheLookingGlass/sphinx-fediverse?label=Pull%20Requests
   :alt: Open GitHub Pull Requests
   :target: https://github.com/LivInTheLookingGlass/sphinx-fediverse/pulls
.. |python| image:: https://img.shields.io/github/actions/workflow/status/LivInTheLookingGlass/sphinx-fediverse/python.yml?label=Py%20Tests
   :alt: GitHub Actions Workflow Status (Python)
   :target: https://github.com/LivInTheLookingGlass/sphinx-fediverse/actions/workflows/python.yml
.. |javascript| image:: https://img.shields.io/github/actions/workflow/status/LivInTheLookingGlass/sphinx-fediverse/javascript.yml?label=JS%20Tests
   :alt: GitHub Actions Workflow Status (JavaScript)
   :target: https://github.com/LivInTheLookingGlass/sphinx-fediverse/actions/workflows/javascript.yml
.. |python-lint| image:: https://img.shields.io/github/actions/workflow/status/LivInTheLookingGlass/sphinx-fediverse/python-lint.yml?label=Py%20Lint
   :alt: GitHub Actions Workflow Status (Python Lint)
   :target: https://github.com/LivInTheLookingGlass/sphinx-fediverse/actions/workflows/python-lint.yml
.. |javascript-lint| image:: https://img.shields.io/github/actions/workflow/status/LivInTheLookingGlass/sphinx-fediverse/eslint.yml?label=JS%20Lint
   :alt: GitHub Actions Workflow Status (JavaScript Lint)
   :target: https://github.com/LivInTheLookingGlass/sphinx-fediverse/actions/workflows/eslint.yml
.. |codecov| image:: https://img.shields.io/codecov/c/github/LivInTheLookingGlass/sphinx-fediverse?label=Coverage
   :alt: Code Coverage (Overall)
   :target: https://app.codecov.io/gh/LivInTheLookingGlass/sphinx-fediverse/tree/main/
.. |codecov-py| image:: https://img.shields.io/codecov/c/github/LivInTheLookingGlass/sphinx-fediverse?flag=Python&label=Coverage%20(Py)
   :alt: Code Coverage (Python)
   :target: https://app.codecov.io/gh/LivInTheLookingGlass/sphinx-fediverse/tree/main?flags%5B0%5D=Python
.. |codecov-js| image:: https://img.shields.io/codecov/c/github/LivInTheLookingGlass/sphinx-fediverse?flag=JavaScript&label=Coverage%20(JS)
   :alt: Code Coverage (JavaScript)
   :target: https://app.codecov.io/gh/LivInTheLookingGlass/sphinx-fediverse/tree/main?flags%5B0%5D=JavaScript

| |license| |status| |version| |downloads|
| |python| |javascript| |python-lint| |javascript-lint|
| |codecov| |codecov-py| |codecov-js|
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

There are a several values that you may provide:

.. table::

   ========================  ===============================================  ===============================
   Option                    Description                                      Example
   ========================  ===============================================  ===============================
   html_baseurl              The host your documentation will be on           https://www.sphinx-doc.org/
   fedi_flavor               The API your server implements                   ``'mastodon'`` or ``'misskey'``
   fedi_username             The username of the account to make posts on     xkcd
   fedi_instance             The host you're making comments on               botsin.space
   comments_mapping_file     The name of the comments map file                comments_mapping.json (default)
   replace_index_with_slash  True to replace ``/index.html`` with ``/``       True (default)
   enable_post_creation      True to automatically post, False for manual     True (default)
   raise_error_if_no_post    True to raise an error if not post is made       True (default)
   comment_fetch_depth       The number of recursive fetches to make          5 (default)
   comment_section_level     The header level of the comments section         2 (default)
   comment_section_title     The title of the comments section                Comments (default)
   allow_custom_emoji        Whether to replace emoji shortcodes with images  True (default)
   allow_sensitive_emoji     Whether to parse sensitive custom emoji          False (default)
   allow_media_attachments   Whether to include attached images               True (default)
   allow_avatars             Whether to include user avatar images            True (default)
   delay_comment_load        Delay loading comments until they are in view    True (default)
   default_reaction_emoji    The default reaction to use when unsupported     ❤ (default)
   fedi_retry_delay          The amount of time to wait on rate-limit error   100 (default, in ms)
   ========================  ===============================================  ===============================

We also rely on environment variables for authentication.

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

Directive Options
-----------------

In addition to the above configuration values, you can modify most of them on a per-directive basis!

.. table::

   ========================  ============================================  ==================================
   Option                    Description                                   Example(s)
   ========================  ============================================  ==================================
   fedi_flavor               (See Above)                                   (See Above)
   fedi_username             (See Above)                                   (See Above)
   fedi_instance             (See Above)                                   (See Above)
   comments_mapping_file     (See Above)                                   (See Above)
   replace_index_with_slash  (See Above)                                   (See Above)
   enable_post_creation      (See Above)                                   (See Above)
   raise_error_if_no_post    (See Above)                                   (See Above)
   fetch_depth               (See comment_fetch_depth Above)               (See Above)
   section_level             (See comment_section_level Above)             (See Above)
   section_title             (See comment_section_title Above)             (See Above)
   post_id                   A hardcoded post ID to use for comments       None (default), 114032235423688612
   allow_custom_emoji        (See Above)                                   (See Above)
   allow_sensitive_emoji     (See Above)                                   (See Above)
   allow_media_attachments   (See Above)                                   (See Above)
   allow_avatars             (See Above)                                   (See Above)
   delay_comment_load        (See Above)                                   (See Above)
   default_reaction_emoji    (See Above)                                   (See Above)
   fedi_retry_delay          (See Above)                                   (See Above)
   ========================  ============================================  ==================================

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
- `nature <https://sphinx-fediverse.oliviaappleton.com/nature/>`_
- `pyramid <https://sphinx-fediverse.oliviaappleton.com/pyramid/>`_
- `scrolls <https://sphinx-fediverse.oliviaappleton.com/scrolls/>`_
- `sphinxdoc <https://sphinx-fediverse.oliviaappleton.com/sphinxdoc/>`_
- `traditional <https://sphinx-fediverse.oliviaappleton.com/traditional/>`_

Dependencies
~~~~~~~~~~~~

JavaScript
----------

Note that by using this plugin, you will be including the following in your page:

- `Marked <https://marked.js.org/>`_ for rendering Markdown (Misskey only)
- `DOMPurify <https://github.com/cure53/DOMPurify>`_ for HTML sanitization

We also use `Babel <https://babeljs.io/>`_ to ensure compatibility with most browsers. This is not included directly,
but is used to pre-process the included javascript before release.

Python
------

In the Python stack, you will be utilizing the following:

- `Sphinx <https://www.sphinx-doc.org/>`_
- `docutils <https://docutils.sourceforge.io/>`_
- At least one of: `Mastodon.py <https://github.com/halcy/Mastodon.py>`_, `Misskey.py <https://github.com/YuzuRyo61/Misskey.py>`_

Privacy Policy
~~~~~~~~~~~~~~

When rendering federated comments, this extension may load images, custom emoji, or avatars directly from third-party
Fediverse instances (e.g. mastodon.social, misskey.io). As with any embedded resource, your visitors' browsers may send
requests to those instances, which can include their IP address and user agent.

This extension performs no tracking, remote logging, or cookie storage. All data is fetched live in the browser at page
load and is never persisted or sent to third parties by the extension itself.

If you are concerned about data exposure to remote domains, you may disable media attachments, custom emoji, or avatars
using directive options such as ``allow_media_attachments``, ``allow_custom_emoji``, ``allow_avatars``. Any help in
ensuring full GDPR (and similar) compliance would be greatly appreciated.
