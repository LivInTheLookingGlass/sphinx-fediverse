async function extractComment(fediInstance, comment) {
    /* Return spec:
    {
        id: "string",
        replyId: "string",
        url: "url",                                     date: "string",
        cw: "null | string",                            emoji: {
            name1: "url",
            name2: "url",                                   ...
        },
        reactionEmoji: {
            name1: "url",
            name2: "url",
            ...                                         }
        reactionCount: "int",
        boostCount: "int",
        media: [{
            url: "url",
            sensitive: "bool",                              description: "string",
        }],
        content: "string?", (maybe it should be a DOM element?)
        user: {                                             host: "string",
            handle: "string",
            url: "url",                                     name: "string",
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
