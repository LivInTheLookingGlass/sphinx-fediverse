const emojiCache = {};

function escapeHtml(unsafe) {
	return unsafe
		.replaceAll(/&/g,  "&amp;")
		.replaceAll(/#/g,  "&#35;")
		.replaceAll(/</g,  "&lt;")
		.replaceAll(/>/g,  "&gt;")
		.replaceAll(/`/g,  '&#96;')
		.replaceAll(/"/g,  "&quot;")
		.replaceAll(/'/g,  "&#039;")
		.replaceAll(/\*/g, "&#42;")
		.replaceAll(/@/g,  "&#64;");
}

function parseBorders(_, style, text) {
	const p = {
		// defaults
		'color': '86b300',
		'radius': '0',
		'width': '1',
		'style': 'solid',
		'clip': true,
	};
	for (const pair of style.split(',')) {
		if (pair === 'noclip') {
			p['clip'] = false;
		} else {
			const [key, value] = pair.split('=');
			p[key] = value;
		}
	}
	const border = `${p.width}px ${p.style} #${p.color}`;
	const clip = p.clip ? ' overflow: clip;' : '';
	return `<span style="border: ${border}; border-radius: ${p.radius}px;${clip}">${text}</span>`;
}

function transformMFM(text, fediInstance) {
	// transforms as much of MFM as possible into standard Markdown
	const multiTransforms = [
		// gums means global, unicode, multi-line, dot-includes-spaces
		// escape plain contents
		[/<plain>(.*)<\/plain>/gums,        (match, p1) => escapeHtml(p1)],
		// wrap centered stuff in div
		[/<center>(.*)<\/center>/gums,      (match, p1) => `<div style="text-align: center;">${p1}</div>`],
		// <i> tag is single-line because the markdown equivalent doesn't work across multiple lines; falls back to HTML
		[/<i>([^\r\n]*)<\/i>/gu,            (match, p1) => `*${p1}*`],
		// small is roughly the same a sub
		[/<small>(.*)<\/small>/gums,        (match, p1) => `<sub>${p1}</sub>`],
		// flip needs a block because you can do one or multiple directions. multiple is tricky to parse
		[/\$\[flip\.(?=[,hv]*h)(?=[,hv]*v)(?:h|v)(?:,?(?:h|v))* (.+)\]/gus, 
			(match, p1) => `<span style="transform: scale(-1, -1);">${p1}</span>`],
		[/\$\[flip\.v(?:,v)* (.+)\]/gu,     (match, p1) => `<span style="transform: scaleY(-1);">${p1}</span>`],
		[/\$\[flip(?:.h(?:,h)*)? (.+)\]/gu, (match, p1) => `<span style="transform: scaleX(-1);">${p1}</span>`],
		// blur is just a css span
		[/\$\[blur (.+)\]/gu,               (match, p1) => `<span style="filter: blur(3px);">${p1}</span>`],
		// hashtags outside of links should get transformed
		[/(?<![\[/=]|style="border:[\w ]+)#([^\d\s][\w\p{L}\p{M}-]*)/gu, 
			(match, p1) => `[#${p1}](https://${fediInstance}/tags/${p1})`],
		// links with preview-disabled should get transformed; we don't do previews
		[/\?\[(.+)\]\((.+)\)/gu,            (match, p1, p2) => `[${p1}](${p2})`],
		// mentions outside of links should be transformed
		[/(?<![\[/]|@[\p{L}\p{M}\w\._\-]+)@([\p{L}\p{M}\w\._\-]+(?:@[a-zA-Z0-9\._\-]+)?)/gu, 
			(match, p1) => `[@${p1}](https://${fediInstance}/@${p1})`],
		// turn ruby text into the right html tags
		[/\$\[ruby ([\p{L}\p{M}\w_\-]+) +([\p{L}\p{M}\w_\-]+)\]/gums,
			(match, p1, p2) => `<ruby>${p1} <rp>(</rp><rt>${p2}</rt><rp>)</rp></ruby>`],
		// color is a css span
		[/\$\[(f|b)g.color=([\da-fA-F]{3,4}|[\da-fA-F]{6}) (.+)\]/gums,
			(match, p1, p2, p3) => `<span style="${p1 === 'b' ? 'background-' : ''}color=#${p2};">${p3}</span>`],
		// scale is a css span with transform
		[/\$\[(?:scale\.)?(?:y=(\d+),)?x=?(\d+)(?:,y=(\d+))? (.+)\]/gums,
			(match, py1, px, py2, text) =>
				`<span style="transform: scale(${px || py1}, ${py1 || py2 || px});">${text}</span>`],
		// font is surprisingly easy
		[/\$\[font\.((?:sans-)?serif|monospace|fantasy|cursive) (.+)\]/gums,
			(match, p1, p2) => `<span style="font-family: ${p1};">${p2}</span>`],
		// border parsing is really complicated
		// eslint-disable-next-line max-len
		[/\$\[border\.((?:(?:style|width|color|radius)=(?:\w)+|noclip)(?:,(?:(?:style|width|color|radius)=(?:\w)+|noclip))*) +(.+?)\]/gums,
			parseBorders
		]
	];
	let newText = text;
	let lastRoundText = '';

	while (newText !== lastRoundText) {
		lastRoundText = newText;
		for (const [pattern, func] of multiTransforms) {
			text = '';
			while (text !== newText) {
				text = newText;
				newText = text.replaceAll(pattern, func);
			}
		}
	}
	return text;
}

/**
 * This will transform the information returned by the Misskey API into the common comment structure.
 *
 * @param {String} fediInstance - The domain name of your fedi instance
 * @param {String} comment - The ID of the comment you are fetching metadata for
 * @returns {fedi_script.Comment}
 */
async function extractCommentMisskey(fediInstance, comment) {
	const user = comment.user;
	const domain = user.host || fediInstance;
	const handle = `@${user.username}@${domain}`;
	const attachments = [];
	const reactions = {"❤": 0};
	let commentEmoji = comment.emojis || {};
	let userEmoji = user.emojis || {};

	const cw = (comment.cw && user.mandatoryCW) ? `${user.mandatoryCW} + ${comment.cw}` :
		(user.mandatoryCW ? user.mandatoryCW : comment.cw);

	for (const attachment of comment.files) {
		if (attachment.type.substring('image') !== -1) {
			attachments.push({
				url: attachment.url,
				sensitive: attachment.isSensitive,
				description: attachment.comment,
			});
		}
	}

	for (const reaction in comment.reactions) {
		if (reaction.length === 1) {
			reactions[reaction] = comment.reactions[reaction];
		} else {
			reactions["❤"] += comment.reactions[reaction];
		}
	}

	if (!comment.emojis) {
		const pattern = /:([\w\p{L}][\w\p{L}\d\p{N}_]+):/gu;
		const pairs = await Promise.all(
			Array.from(comment.text.matchAll(pattern))
				.map(match => match[1])
				.map(name => fetchMisskeyEmoji(domain, name))
		);
		Object.assign(commentEmoji, ...pairs);
	}

	if (!user.emojis) {
		const pattern = /:([\w\p{L}][\w\p{L}\d\p{N}_]+):/gu;
		const pairs = await Promise.all(
			Array.from(user.name.matchAll(pattern))
				.map(match => match[1])
				.map(name => fetchMisskeyEmoji(domain, name))
		);
		Object.assign(commentEmoji, ...pairs);
	}

	return {
		id: comment.id,
		replyId: comment.replyId || comment.renoteId,
		url: `https://${fediInstance}/notes/${comment.id}`,
		date: comment.createdAt,
		cw: cw,
		emoji: commentEmoji,
		reactionEmoji: comment.reactionEmojis,
		reactionCount: comment.reactionCount,
		boostCount: comment.renoteCount,
		reactions: reactions,
		media: attachments,
		content: marked.parse(transformMFM(comment.text)),
		user: {
			host: domain,
			handle: `@${user.username}\u200B@${domain}`,
			url: `https://${fediInstance}/${handle}`,
			name: user.name,
			avatar: user.avatarUrl,
			emoji: userEmoji
		}
	};
}

async function fetchMisskeyEmoji(fediInstance, name) {
	const ret = {};
	if (emojiCache[name]) {
		ret[name] = emojiCache[name];
		return ret;
	}
	try {
		const response = await fetch(`https://${fediInstance}/api/emoji`, {
			method: 'POST',
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ name: name }),
		});
		if (!response.ok) {
			if (response.status == 429) {
				await new Promise((resolve) => setTimeout(resolve, 100))
				return await fetchMisskeyEmoji(fediInstance, name);
			}
		} else {
			const data = await response.json();
			if (!data.isSensitive) {
				ret[name] = data.url;
				emojiCache[name] = data.url;
			}
		}
	} catch (err) {
		console.log(`Could not fetch Misskey emoji ${name}`, err);
	}
	return ret;
}

/**
 * The Misskey implementation of :js:func:`~fedi_script.fetchSubcomments`\ . This will return comment objects
 * following the common comment return spec.
 *
 * @param {String} fediInstance - The domain name of your fedi instance
 * @param {String} postId - The ID of the post you are fetching metadata for
 * @returns {Comment[]} The resulting sub\ :js:func:`~fedi_script.Comment`\ s
 */
async function fetchSubcommentsMisskey(fediInstance, commentId) {
	try {
		const response = await fetch(`https://${fediInstance}/api/notes/children`, {
			method: 'POST',
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				noteId: commentId,
				limit: 100
			})
		});

		if (!response.ok) {
			if (response.status == 429) {
				await new Promise((resolve) => setTimeout(resolve, 100))
				return await fetchSubcommentsMisskey(fediInstance, commentId);
			}
			throw new Error(`HTTP error! Status: ${response.status}`);
		}

		const data = await response.json();
		return Promise.all(data.map(
			comment => extractCommentMisskey(fediInstance, comment)
		));
	} catch (error) {
		console.error(`Error fetching subcomments for ${commentId}:`, error);
	}
}

/**
 * The Misskey implementation of :js:func:`~fedi_script.fetchMeta`. This will update the global comment stats.
 *
 * @param {String} fediInstance - The domain name of your fedi instance
 * @param {String} postId - The ID of the post you are fetching metadata for
 */
async function fetchMetaMisskey(fediInstance, postId) {
	await Promise.all([
		fetchMeta1Misskey(fediInstance, postId),
		fetchMeta2Misskey(fediInstance, postId)
	]);
}

async function fetchMeta1Misskey(fediInstance, postId) {
	try {
		const response = await fetch(`https://${fediInstance}/api/notes/show`, {
			method: 'POST',
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ noteId: postId }),
		});
		if (!response.ok) {
			if (response.status == 429) {
				await new Promise((resolve) => setTimeout(resolve, 100));
				return await fetchMeta1Misskey(fediInstance, postId);
			}
			throw new Error(`HTTP error! Status: ${response.status}`);
		}
		const data = await response.json();
		document.getElementById("global-likes").textContent = `${data.reactionCount}`;
	} catch (error) {
		console.error("Error fetching post meta (reactions):", error);
	}
}

async function fetchMeta2Misskey(fediInstance, postId) {
	try {
		const response = await fetch(`https://${fediInstance}/api/notes/renotes`, {
			method: 'POST',
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ noteId: postId, limit: 100 }),
		});
		if (!response.ok) {
			if (response.status == 429) {
				await new Promise((resolve) => setTimeout(resolve, 100));
				return await fetchMeta2Misskey(fediInstance, postId);
			}
			throw new Error(`HTTP error! Status: ${response.status}`);
		}
		const data = await response.json();
		document.getElementById("global-reblogs").textContent = `${data.length}`;
	} catch (error) {
		console.error("Error fetching post meta (renotes):", error);
	}
}

/**
 * This function returns the URL and instance type of a given Fedi user
 *
 * .. warning::
 *   This function is under construction and should be considered unstable
 *
 * @param {String} fediInstance - The domain name of your fedi instance
 * @param {String} handle - The user handle you're looking for
 * @return {{url: String, flavor: String}}
 */
async function queryUserMisskey(fediInstance, handle) {
	try {
		const [_, username, domain] = handle.split("@");
		const response = await fetch(`https://${fediInstance}/api/users/show`, {
			method: 'POST',
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ username: username, host: domain }),
		});
		if (!response.ok) {
			if (response.status == 429) {
				await new Promise((resolve) => setTimeout(resolve, 100));
				return await queryUserMisskey(fediInstance, handle);
			}
			throw new Error(`HTTP error! Status: ${response.status}`);
		}
		const data = await response.json();
		return {
			'flavor': (data.instance || {}).softwareName || 'misskey',
			'url': data.url || `https://${domain}/@${username}`,
		};
	} catch (error) {
		console.error("Error fetching user info:", error);
	}
}

if (typeof module !== 'undefined') {
	module.exports = {
		transformMFM,
		escapeHtml,
		extractCommentMisskey,
		fetchMisskeyEmoji,
		fetchSubcommentsMisskey,
		fetchMetaMisskey,
		queryUserMisskey,
	};
}
