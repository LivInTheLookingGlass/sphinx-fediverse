
/**
 * This will transform the information returned by the Mastodon API into the common comment structure.
 *
 * Callers:
 *
 * - :js:func:`~fedi_script_mastodon.fetchSubcommentsMastodon`
 *
 * @async
 * @param {String} fediInstance - The domain name of your fedi instance
 * @param {String} comment - The ID of the comment you are fetching metadata for
 * @returns {fedi_script.Comment}
 */
async function extractCommentMastodon(fediInstance, comment) {
	const user = comment.account;
	const match = user.url.match(/https?:\/\/([^\/]+)/);
	const domain = match ? match[1] : null;
	const attachments = [];
	const commentEmoji = {};
	const userEmoji = {};
	const reactions = {"❤": 0};
	let handle;

	if (!domain) {
		console.error("Could not extract domain name from url: " + user.url);
		handle = `@${user.username}`;
	} else {
		handle = `@${user.username}\u200B@${domain}`;
	}

	for (const attachment of comment.media_attachments) {
		if (attachment.type === 'image') {
			attachments.push({
				url: attachment.remote_url || attachment.url,
				sensitive: comment.sensitive,
				description: attachment.description
			});
		}
	}

	if (comment.emoji_reactions) {  // TODO: test this
		for (const reaction of comment.emoji_reactions) {
			if (reaction.name.length === 1) {
				reactions[reaction.name] = reaction.count;
			} else {
				reactions["❤"] += reaction.count;
			}
		}
	} else {
		reactions["❤"] = comment.favourites_count;
	}

	for (const emoji of user.emojis) {
		userEmoji[emoji.shortcode] = emoji.static_url;
	}

	for (const emoji of comment.emojis) {
		commentEmoji[emoji.shortcode] = emoji.static_url;
	}

	return {
		id: comment.id,
		replyId: comment.in_reply_to_id,
		url: comment.url,
		date: comment.created_at,
		cw: comment.spoiler_text,
		emoji: commentEmoji,
		reactionCount: comment.favourites_count,
		reactionEmoji: {},
		boostCount: comment.reblogs_count,
		media: attachments,
		reactions: reactions,
		content: comment.content,
		user: {
			host: domain,
			handle: handle,
			url: user.url,
			name: user.display_name,
			avatar: user.avatar_static || user.avatarUrl,
			emoji: userEmoji
		}
	};
}

/**
 * The Mastodon implementation of :js:func:`~fedi_script.fetchSubcomments`\ . This will return comment objects
 * following the common comment return spec.
 *
 * Callers:
 *
 * - :js:func:`fedi_script.fetchSubcomments`
 *
 * @async
 * @param {String} fediInstance - The domain name of your fedi instance
 * @param {String} postId - The ID of the post you are fetching metadata for
 * @returns {Comment[]} The resulting sub\ :js:func:`~fedi_script.Comment`\ s
 */
async function fetchSubcommentsMastodon(fediInstance, commentId) {
	try {
		const response = await fetch(`https://${fediInstance}/api/v1/statuses/${commentId}/context`);

		if (!response.ok) {
			if (response.status == 429) {
				await new Promise((resolve) => setTimeout(resolve, 100))
				return await fetchSubcomments(fediInstance, commentId);
			}
			throw new Error(`HTTP error! Status: ${response.status}`);
		}

		const data = await response.json();
		return Promise.all(data.descendants.map(
			comment => extractCommentMastodon(fediInstance, comment)
		));
	} catch (error) {
		console.error(`Error fetching subcomments for ${commentId}:`, error);
	}
}

/**
 * The Mastodon implementation of :js:func:`~fedi_script.fetchMeta`. This will update the global comment stats.
 *
 * Callers:
 *
 * - :js:func:`fedi_script.fetchMeta`
 *
 * @async
 * @param {String} fediInstance - The domain name of your fedi instance
 * @param {String} postId - The ID of the post you are fetching metadata for
 */
async function fetchMetaMastodon(fediInstance, postId) {
	try {
		// Mastodon fetches a post's details using a GET request to /api/v1/statuses/:id
		const response = await fetch(`https://${fediInstance}/api/v1/statuses/${postId}`);

		if (!response.ok) {
			if (response.status == 429) {
				await new Promise((resolve) => setTimeout(resolve, 100))
				return await fetchMetaMastodon(fediInstance, postId);
			}
			throw new Error(`HTTP error! Status: ${response.status}`);
		}

		const data = await response.json();
		document.getElementById("global-likes").textContent = `${data.favourites_count}`;
		document.getElementById("global-reblogs").textContent = `${data.reblogs_count}`;

	} catch (error) {
		console.error("Error fetching post meta:", error);
	}
}

/**
 * This function returns the URL and instance type of a given Fedi user
 *
 * .. warning::
 *   This function is under construction and should be considered unstable
 *
 * @async
 * @param {String} fediInstance - The domain name of your fedi instance
 * @param {String} handle - The user handle you're looking for
 * @return {{url: String, flavor: String}}
 */
async function queryUserMastodon(fediInstance, handle) {
	try {
		const response = await fetch(`https://${fediInstance}/api/v1/accounts/lookup?acct=${handle}`);

		if (!response.ok) {
			if (response.status == 429) {
				await new Promise((resolve) => setTimeout(resolve, 100))
				return await queryUserMastodon(fediInstance, handle);
			}
			throw new Error(`HTTP error on user fetch! Status: ${response.status}`);
		}

		const data = await response.json();
		const domain = data.url.split('/')[2];
		const nodeinfo = await fetch(`https://${domain}/nodeinfo/2.0`);
		if (!nodeinfo.ok) {
			throw new Error(`HTTP error on nodeinfo! Status: ${response.status}`);
		}
		return {
			'url': data.url,
			'flavor': (await nodeinfo.json()).software.name,
		}
	} catch (error) {
		console.error("Error fetching post meta:", error);
	}
}

if (typeof module !== 'undefined') {
	module.exports = {
		extractCommentMastodon,
		fetchSubcommentsMastodon,
		fetchMetaMastodon,
		queryUserMastodon,
	};
}
