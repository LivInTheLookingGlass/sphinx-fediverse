const emojiCache = {};

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/`/g, '&#96;')
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/\*/g, "&#42;");
}

async function extractComment(fediInstance, comment) {
    /* Return spec:
    {
        id: "string",
        replyId: "string",
        url: "url",
        date: "string",
        cw: "null | string",
        emoji: {
            name1: "url",
            name2: "url",
            ...
        },
        reactionEmoji: {
            name1: "url",
            name2: "url",
            ...
        },
        reactionCount: "int",
        boostCount: "int",
        media: [{
            url: "url",
            sensitive: "bool",
            description: "string",
        }],
        content: "string?", (maybe it should be a DOM element?)
        user: {
            host: "string",
            handle: "string",
            url: "url",
            name: "string",
            avatar: "url",
            emoji: {
                name1: "url",
                name2: "url",
                ...
            },
        },
    }
    */
    const user = comment.user;
    const domain = user.host || fediInstance;
    const handle = `@${user.username}@${domain}`;
    const attachments = [];
    const reactions = {"❤": 0};
    let commentEmoji = comment.emojis || {};
    let userEmoji = user.emojis || {};
    // TODO: the non-annying parts of MFM
    // replace mentions, hashtags with markdown links
    const text = comment.text.replaceAll(
        /#([^\d\s][\w\p{L}\p{M}-]*)/gu, (match, p1) => `[#${p1}](https://${fediInstance}/tags/${p1})`
    ).replaceAll(
        /@([\p{L}\p{M}\w.-]+(?:@[a-zA-Z0-9.-]+)?)/gu, (match, p1) => `[@${p1}](https://${fediInstance}/@${p1})`
    ).replaceAll(
        /<plain>(.*?)<\/plain>/gs, (match, p1) => escapeHtml(p1)
    ).replaceAll(
        /<center>(.*?)<\/center>/gs, (match, p1) => `<div style="text-align: center;">${p1}</div>`
    ).replaceAll(
        /<i>(.*?)<\/i>/gs, (match, p1) => `*${p1}*`
    ).replaceAll(
        /<small>(.*?)<\/small>/gs, (match, p1) => `<sub>${p1}</sub>`
    );

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
        content: marked.parse(text),
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

async function fetchSubcomments(fediInstance, commentId) {
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
                return await fetchSubcomments(fediInstance, commentId);
            }
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return Promise.all(data.map(
            comment => extractComment(fediInstance, comment)
        ));
    } catch (error) {
        console.error(`Error fetching subcomments for ${commentId}:`, error);
    }
}

async function fetchMeta(fediInstance, postId) {
    let response;
    let data;

    try {
        // Misskey has a different endpoint for fetching a post's details
        response = await fetch(`https://${fediInstance}/api/notes/show`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ noteId: postId }),
        });

        if (!response.ok) {
            if (response.status == 429) {
                await new Promise((resolve) => setTimeout(resolve, 100))
                return await fetchMeta(fediInstance, postId);
            }
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        data = await response.json();
        document.getElementById("global-likes").textContent = `${data.reactionCount}`;
        document.getElementById("global-reblogs").textContent = `${data.renoteCount}`;
    } catch (error) {
        console.error("Error fetching post meta:", error);
    }
}

if (typeof module !== 'undefined') {
    module.exports = {
        escapeHtml,
        extractComment,
        fetchMisskeyEmoji,
        fetchSubcomments,
        fetchMeta,
    };
}
