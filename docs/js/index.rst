JavaScript API
##############

In this section we talk about the JavaScript API and how to repackage these files for your project

Division of Files
=================

In order to reduce the size of your web page, this project has been divided into a modular architecture. Each fediverse
implementation has its own plugin to parse data, and the top level "glue script" serves partly as a redirect and partly
as a common renderer.

Glue Script
~~~~~~~~~~~

View source code :source:`jssrc/fedi_script.js`

.. note::

    This requires ``DOMPurify`` to be loaded on your site

.. js:autofunction:: fedi_script.setImageLink
.. js:autofunction:: fedi_script.fetchComments
.. js:autofunction:: fedi_script.fetchMeta
.. js:autofunction:: fedi_script.fetchSubcomments
.. js:autofunction:: fedi_script.replaceEmoji
.. js:autofunction:: fedi_script.renderComment
.. js:autofunction:: fedi_script.renderCommentsBatch
.. js:autoclass:: fedi_script.FediverseFlavor
.. js:autoclass:: fedi_script.Comment
.. js:autoclass:: fedi_script.EmojiDescriber
.. js:autoclass:: fedi_script.MediaAttachment
.. js:autoclass:: fedi_script.User

Mastodon Plugin
~~~~~~~~~~~~~~~

View source code :source:`jssrc/fedi_script_mstodon.js`

.. js:autofunction:: fedi_script_mastodon.extractCommentMastodon
.. js:autofunction:: fedi_script_mastodon.fetchMetaMastodon
.. js:autofunction:: fedi_script_mastodon.fetchSubcommentsMastodon
.. js:autofunction:: fedi_script_mastodon.queryUserMastodon

Misskey Plugin
~~~~~~~~~~~~~~

View source code :source:`jssrc/fedi_script_misskey.js`

.. note::

    This plugin requires ``marked.js`` as a dependency

.. js:autofunction:: fedi_script_misskey.extractCommentMisskey
.. js:autofunction:: fedi_script_misskey.fetchMisskeyEmoji
.. js:autofunction:: fedi_script_misskey.fetchMetaMisskey
.. js:autofunction:: fedi_script_misskey.fetchMetaMisskey1
.. js:autofunction:: fedi_script_misskey.fetchMetaMisskey2
.. js:autofunction:: fedi_script_misskey.fetchSubcommentsMisskey
.. js:autofunction:: fedi_script_misskey.queryUserMisskey

Minimal Page Infrastructure
===========================
