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
 * @property {fedi_script.EmojiDescriber} emoji - Emoji used in the post
 * @property {fedi_script.EmojiDescriber} reactionEmoji - Emoji used in reactions (mix of unicode emoji & custom names)
 * @property {fedi_script.User} user - Information about the posting user
 * @property {MediaAttachment[]} media - An array of :js:class:`~fedi_script.MediaAttachment`\ s
 */

const config = {
	parser: (typeof DOMParser === 'undefined') ? undefined : new DOMParser(),
	boost_link: "_static/boost.svg",
};

/**
 * Setter for the internal image link used to include the "boost" icon.
 *
 * .. warning::
 *   Call this function before any other, or your boost icon may not work in subdirectories
 *
 * @param {String} new_boost_link - Link to the boost svg in your site structure
 */
function setImageLink(new_boost_link) {
	config.boost_link = new_boost_link;
}

/**
 * A redirect function that will call the relevant plugin's implementation. This will update the global comment stats.
 *
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
 * @param {fedi_script.FediverseFlavor} fediFlavor
 * @param {String} fediInstance - The domain name of your fedi instance
 * @param {String} postId - The ID of the post you are fetching metadata for
 * @returns {fedi_script.Comment[]} The resulting sub\ :js:func:`~fedi_script.Comment`\ s
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
 * @param {String} string - The HTML string to parse
 * @param {fedi_script.EmojiDescriber} emojis - The shortcodes you expect to see
 * @returns {DOMFragment} The sanitized, parsed document fragment
 */
function replaceEmoji(string, emojis) {
	for (const shortcode in emojis) {
		const static_url = DOMPurify.sanitize(emojis[shortcode]);
		string = string.replaceAll(
			`:${shortcode}:`,
			`<img src="${static_url}" class="emoji" alt="Custom emoji: ${DOMPurify.sanitize(shortcode)}">`
		)
	};
	const container = document.createDocumentFragment();
	const newBody = config.parser.parseFromString(DOMPurify.sanitize(string), 'text/html');
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

	const avatar = document.createElement("img");
	avatar.setAttribute("src", comment.user.avatar);
	avatar.setAttribute("alt", `Avatar for ${DOMPurify.sanitize(comment.user.name)}`);
	avatar.setAttribute("height", 30);
	avatar.setAttribute("width", 30);
	authorDiv.appendChild(avatar);

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
	// We're assuming sanitized strings here. On Mastodon that's true, but on Misskey it's not. TODO.
	contentText.appendChild(replaceEmoji(comment.content, comment.emoji));
	content.appendChild(contentText);

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

	commentInterior.appendChild(content);
	const infoNode = document.createElement("div");
	infoNode.classList.add("info");
	const boostIcon = document.createElement("span");
	boostIcon.classList.add("reaction");
	const boostIconImage = document.createElement("img");
	boostIconImage.setAttribute("src", config.boost_link);
	boostIconImage.setAttribute("alt", "Boosts");
	boostIconImage.classList.add("fedi-icon");
	boostIcon.appendChild(boostIconImage);
	boostIcon.appendChild(document.createTextNode(comment.boostCount + ' '));
	infoNode.appendChild(boostIcon);
	commentDiv.appendChild(infoNode);

	const reactionKeys = Object.keys(comment.reactions);
	reactionKeys.sort((a, b) => comment.reactions[a] < comment.reactions[b]);
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
 * @param {fedi_script.FediverseFlavor} fediFlavor 
 * @param {String} fediInstance 
 * @param {String} postId 
 * @param {Number} maxDepth 
 */
async function fetchComments(fediFlavor, fediInstance, postId, maxDepth) {
	try {
		fetchMeta(fediFlavor, fediInstance, postId);
		while (maxDepth--) {
			const replies = await fetchSubcomments(fediFlavor, fediInstance, postId);
			renderCommentsBatch(replies);
			await Promise.all(replies.map(reply => fetchSubcomments(fediFlavor, fediInstance, reply.id)));
		}
	} catch (error) {
		console.error("Error fetching comments:", error);
	}
}

if (typeof module !== 'undefined') {
	module.exports = {
		config,
		setImageLink,
		replaceEmoji,
		renderComment,
		renderCommentsBatch,
		fetchComments,
		fetchMeta,
	};
}
