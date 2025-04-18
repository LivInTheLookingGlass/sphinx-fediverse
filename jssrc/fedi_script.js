/**
 * A mapping of names to URLs. All properties involved are strings.
 * @typedef {Object} EmojiDescriber
 */
/**
 * A string matching one of the supported fediverse implementations: `'mastodon'` or `'misskey'`
 * @typedef {String} FediverseFlavor
 */

/**
 * @typedef {Object} MediaAttachment
 * @property {String} url - The link to the full size image
 * @property {boolean} sensitive - A marker of image sensitivity (Misskey can set this individually)
 * @property {String} description - The alt text of the image
 */

/**
 * @typedef {Object} User
 * @property {String} url - The link to the user's profile
 * @property {String} host - The user's instance domain
 * @property {String} handle - The user's fediverse handle
 * @property {String} name - The user's name (often with embedded emoji)
 * @property {String} avatar - The user's profile picture
 * @property {fedi_script.EmojiDescriber} emoji - Emoji used in the user's name/description
 */

/**
 * The common comment return type
 * @typedef {Object} Comment
 * @property {String} id - The comment ID
 * @property {String} replyId - The parent comment ID
 * @property {String} url - The link to the comment (either on your instance or remote host)
 * @property {String} date - The original post date (not accounting for edits)
 * @property {String|null} cw - Either text containing a content warning, or null
 * @property {Number} reactionCount - The number of reactions on the comment
 * @property {Number} boostCount - The number of times the comment was boosted or quoted
 * @property {String} content - The unsanitized HTML content of the comment (may change to DOM fragment)
 * @property {Object} reactions - A mapping of emoji (unicode or custom) to the number of reactions on a comment
 * @property {fedi_script.EmojiDescriber} emoji - Emoji used in the post
 * @property {fedi_script.EmojiDescriber} reactionEmoji - Emoji used in reactions (mix of unicode emoji & custom names)
 * @property {fedi_script.User} user - Information about the posting user
 * @property {MediaAttachment[]} media - An array of :js:class:`~fedi_script.MediaAttachment`\ s
 */

const fediConfig = {
	parser: (typeof DOMParser === 'undefined') ? undefined : new DOMParser(),
	boostLink: "_static/boost.svg",
	allowSensitiveEmoji: false,
	allowCustomEmoji: true,
	allowMediaAttachments: true,
	allowAvatars: true,
	delayCommentLoad: true,
	defaultReactionEmoji: "❤",
	retryDelay: 100,
	// TODO: max reply depth
	// TODO: disable reactions
	// TODO: threshold for comment lazy loading
};

/**
 * Setter for internal configuration properties
 *
 * .. warning::
 *   Call this function before any other with the value ``'boostLink'`` as a key, or your boost icon may not work in
 *   subdirectories
 * 
 * Available properties to set:
 *
 * - ``boostLink`` - The URL corresponding to the boost SVG
 * - ``allowCustomEmoji`` - Allow custom emoji to be included in comment contents (privacy)
 * - ``allowSensitiveEmoji`` - Allow sensitive emoji to be included in comment contents
 * - ``allowMediaAttachments`` - Allow media attachments to be included in comment contents (privacy)
 * - ``allowAvatars`` - Force avatars to not be loaded (privacy)
 * - ``delayCommentLoad`` - Defers loading of comments section until user brings it into view
 * - ``defaultReactionEmoji`` - The reaction to use when it is not supported or undefined
 * - ``retryDelay`` - The amount of time to wait upon rate-limit error (in ms)
 * - ``parser`` - In testing, allows you to replace the DOMParser
 *
 * @param {Object} newValues
 */
function setConfig(newValues) {
	Object.assign(fediConfig, newValues);
}

/**
 * A redirect function that will call the relevant plugin's implementation. This will update the global comment stats.
 *
 * Calls:
 *
 * - :js:func:`fedi_script_mastodon.fetchMetaMastodon`
 * - :js:func:`fedi_script_misskey.fetchMetaMisskey`
 *
 * Callers:
 *
 * - :js:func:`~fedi_script.fetchComments`
 *
 * @async
 * @param {fedi_script.FediverseFlavor} fediFlavor
 * @param {String} fediInstance - The domain name of your fedi instance
 * @param {String} postId - The ID of the post you are fetching metadata for
 */
async function fetchMeta(fediFlavor, fediInstance, postId) {
	switch (fediFlavor) {
	case 'mastodon':
		return await fetchMetaMastodon(fediInstance, postId);
	case 'misskey':
		return await fetchMetaMisskey(fediInstance, postId);
	default:
		console.error(`Unknown fedi flavor: ${fediFlavor}`);
	}
}

/**
 * A redirect function that will call the relevant plugin's implementation. This will return comment objects following
 * the common comment return spec.
 *
 * Calls:
 *
 * - :js:func:`fedi_script_mastodon.fetchSubcommentsMastodon`
 * - :js:func:`fedi_script_misskey.fetchSubcommentsMisskey`
 *
 * Callers:
 *
 * - :js:func:`~fedi_script.fetchComments`
 * @async
 * @param {fedi_script.FediverseFlavor} fediFlavor
 * @param {String} fediInstance - The domain name of your fedi instance
 * @param {String} postId - The ID of the post you are fetching metadata for
 * @returns {Comment[]} The resulting sub\ :js:func:`~fedi_script.Comment`\ s
 */
async function fetchSubcomments(fediFlavor, fediInstance, postId) {
	switch (fediFlavor) {
	case 'mastodon':
		return await fetchSubcommentsMastodon(fediInstance, postId);
	case 'misskey':
		return await fetchSubcommentsMisskey(fediInstance, postId);
	default:
		console.error(`Unknown fedi flavor: ${fediFlavor}`);
	}
}

/**
 * Takes in an HTML string with embedded custom emoji, and returns a sanitized, parsed DOM fragment incuding the images
 * those emoji shortcodes reference.
 *
 * Calls:
 *
 * - :js:func:`DOMPurify.sanitize`
 *
 * Callers:
 *
 * - :js:func:`~fedi_script.renderComment`
 *
 * @param {String} string - The HTML string to parse
 * @param {fedi_script.EmojiDescriber} emojis - The shortcodes you expect to see
 * @returns {DOMFragment} The sanitized, parsed document fragment
 */
function replaceEmoji(string, emojis) {
	if (fediConfig.allowCustomEmoji) {
		for (const shortcode in emojis) {
			const static_url = DOMPurify.sanitize(emojis[shortcode]);
			string = string.replaceAll(
				`:${shortcode}:`,
				`<img src="${static_url}" class="emoji" alt="Custom emoji: ${DOMPurify.sanitize(shortcode)}">`
			)
		};
	}
	const container = document.createDocumentFragment();
	const newBody = fediConfig.parser.parseFromString(DOMPurify.sanitize(string), 'text/html');
	if (newBody.body.children.length) {
		Array.from(newBody.body.children).forEach(child => container.appendChild(child));
	} else {
		const span = document.createElement("span");
		span.innerHTML = DOMPurify.sanitize(string);
		container.appendChild(span);
	}
	return container;
}

/**
 * Calls:
 *
 * - :js:func:`~fedi_script.replaceEmoji`
 *
 * Callers:
 *
 * - :js:func:`~fedi_script.renderCommentsBatch`
 *
 * @param {fedi_script.Comment} comment 
 * @returns {DOMFragment} The rendered version of the comment
 */
function renderComment(comment) {
	if (document.getElementById(comment.id)) {
		return;
	}
	const fragment = document.createDocumentFragment();
	const commentDiv = document.createElement("div");
	commentDiv.classList.add("comment");
	commentDiv.id = comment.id;

	const authorDiv = document.createElement("div");
	authorDiv.classList.add("author");
	commentDiv.appendChild(authorDiv);

	if (fediConfig.allowAvatars) {
		const avatar = document.createElement("img");
		avatar.setAttribute("src", comment.user.avatar);
		avatar.setAttribute("alt", `Avatar for ${DOMPurify.sanitize(comment.user.name)}`);
		avatar.setAttribute("height", 30);
		avatar.setAttribute("width", 30);
		authorDiv.appendChild(avatar);
	}

	const commentDate = document.createElement("a");
	commentDate.setAttribute("target", "_blank");
	commentDate.setAttribute("href", comment.url);
	commentDate.classList.add("date");
	commentDate.innerText = new Date(comment.date).toLocaleString();
	authorDiv.appendChild(commentDate);

	const userInfo = document.createElement("a");
	userInfo.setAttribute("target", "_blank");
	userInfo.setAttribute("href", comment.user.url);
	const userName = document.createElement("span");
	userName.classList.add("username");
	userName.appendChild(replaceEmoji(DOMPurify.sanitize(comment.user.name), comment.user.emoji));
	userInfo.appendChild(userName);
	userInfo.appendChild(document.createTextNode(" "));
	const userHandle = document.createElement("span");
	userHandle.classList.add("handle");
	userHandle.innerText = comment.user.handle;
	userInfo.appendChild(userHandle);
	authorDiv.appendChild(userInfo);

	let commentInterior;
	if (comment.cw) {
		commentInterior = document.createElement("details");
		const commentSummary = document.createElement("summary");
		commentSummary.appendChild(replaceEmoji(DOMPurify.sanitize(comment.cw), comment.emoji));
		commentInterior.appendChild(commentSummary);
		commentDiv.appendChild(commentInterior);
	} else {
		commentInterior = commentDiv;
	}

	const content = document.createElement("div");
	content.classList.add("content");
	const contentText = document.createElement("div");
	contentText.appendChild(replaceEmoji(comment.content, comment.emoji));
	content.appendChild(contentText);

	if (fediConfig.allowMediaAttachments) {
		for (const attachment of comment.media) {
			const attachmentNode = document.createElement("img");
			attachmentNode.setAttribute("src", attachment.url);
			attachmentNode.setAttribute("alt", attachment.description);
			attachmentNode.classList.add("attachment");
			if (attachment.sensitive && !comment.cw) {
				const attachmentContainer = document.createElement("details");
				const summary = document.createElement("summary");
				summary.textContent = "Media marked as sensitive, click to expand";
				attachmentContainer.appendChild(summary);
				attachmentContainer.appendChild(attachmentNode);
				content.appendChild(attachmentContainer)
			} else {
				content.appendChild(attachmentNode);
			}
		}
	}

	commentInterior.appendChild(content);
	const infoNode = document.createElement("div");
	infoNode.classList.add("info");
	const boostIcon = document.createElement("span");
	boostIcon.classList.add("reaction");
	const boostIconImage = document.createElement("img");
	boostIconImage.setAttribute("src", fediConfig.boostLink);
	boostIconImage.setAttribute("alt", "Boosts");
	boostIconImage.classList.add("fedi-icon");
	boostIcon.appendChild(boostIconImage);
	boostIcon.appendChild(document.createTextNode(comment.boostCount + ' '));
	infoNode.appendChild(boostIcon);
	commentDiv.appendChild(infoNode);

	const reactionKeys = Object.keys(comment.reactions);
	reactionKeys.sort((a, b) => comment.reactions[b] - comment.reactions[a]);
	for (const reaction of reactionKeys) {
		const reactionNode = document.createElement("span");
		reactionNode.classList.add("reaction");
		reactionNode.innerText = `\u00A0${reaction} ${comment.reactions[reaction]}\u00A0`;
		infoNode.appendChild(document.createTextNode('\u00A0'));
		infoNode.appendChild(reactionNode);
	}

	commentDiv.appendChild(document.createElement("br"));

	fragment.appendChild(commentDiv);
	return fragment;
}

/**
 * Renders a batch of comments, in chronological order including nesting
 *
 * Calls:
 *
 * - :js:func:`~fedi_script.renderComment`
 *
 * Callers:
 *
 * - :js:func:`~fedi_script.fetchComments`
 *
 * @param {Comment[]} comments - An array of :js:class:`~fedi_script.Comment`\ s
 */
function renderCommentsBatch(comments) {
	if (!comments || comments.length === 0) return;

	const container = document.getElementById("comments-section");  // Main container
	if (!container) {
		console.error("Comment container not found");
		return;
	}

	comments.sort((a, b) => new Date(a.date) - new Date(b.date));
	console.log(comments);
	comments.forEach(comment => {
		const commentElement = renderComment(comment);
		if (!commentElement) return;

		// Determine where to append the comment
		const parentElement = document.getElementById(comment.replyId) || container;
		parentElement.appendChild(commentElement); // Append immediately
	});
}

/**
 * This function kicks off the whole comment fetching process
 *
 * Calls:
 *
 * - :js:func:`~fedi_script.fetchMeta`
 * - :js:func:`~fedi_script.fetchSubcomments`
 * - :js:func:`~fedi_script.renderCommentsBatch`
 *
 * @async
 * @param {fedi_script.FediverseFlavor} fediFlavor 
 * @param {String} fediInstance 
 * @param {String} postId 
 * @param {Number} maxDepth 
 */
async function fetchComments(fediFlavor, fediInstance, postId, maxDepth) {

	async function _fetchComments() {
		try {
			fetchMeta(fediFlavor, fediInstance, postId);  // fire-and-forget is intentional
			while (maxDepth--) {
				const replies = await fetchSubcomments(fediFlavor, fediInstance, postId);
				renderCommentsBatch(replies);
				await Promise.all(replies.map(reply => fetchSubcomments(fediFlavor, fediInstance, reply.id)));
			}
		} catch (error) {
			console.error("Error fetching comments:", error);
		}
	}

	const targetElement = document.querySelector(".comments-info");
	if (fediConfig.delayCommentLoad && typeof IntersectionObserver !== 'undefined' && targetElement) {
		console.log("Delaying comment load until they come into view");
		const observer = new IntersectionObserver(function onInView(entries, observer) {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					console.log("Loading comments after coming into view");
					_fetchComments();  // fire-and-forget is intentional
					observer.disconnect();
				}
			}
		}, { threshold: 0.01 });
		observer.observe(targetElement);
	} else {
		_fetchComments();  // fire-and-forget is intentional
	}
}

if (typeof module !== 'undefined') {
	module.exports = {
		fediConfig,
		setConfig,
		replaceEmoji,
		renderComment,
		renderCommentsBatch,
		fetchComments,
		fetchMeta,
	};
}
