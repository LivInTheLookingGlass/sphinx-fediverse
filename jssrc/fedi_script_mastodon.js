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

async function fetchSubcomments(fediInstance, commentId) {
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
        // Mastodon fetches a post's details using a GET request to /api/v1/statuses/:id
        response = await fetch(`https://${fediInstance}/api/v1/statuses/${postId}`);

        if (!response.ok) {
            if (response.status == 429) {
                await new Promise((resolve) => setTimeout(resolve, 100))
                return await fetchMeta(fediInstance, postId);
            }
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        data = await response.json();
        document.getElementById("global-likes").textContent = `${data.favourites_count}`;
        document.getElementById("global-reblogs").textContent = `${data.reblogs_count}`;

    } catch (error) {
        console.error("Error fetching post meta:", error);
    }
}

if (typeof module !== 'undefined') {
    module.exports = {
        extractComment,
        fetchSubcomments,
        fetchMeta,
    };
}
