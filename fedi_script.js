const parser = new DOMParser();
let like_link = "_static/like.svg";
let boost_link = "_static/boost.svg";

function setImageLinks(new_like_link, new_boost_link) {
    like_link = new_like_link;
    boost_link = new_boost_link;
}

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

function replaceEmoji(string, emojis) {
    for (const shortcode in emojis) {
        const static_url = emojis[shortcode];
        string = string.replaceAll(
            `:${shortcode}:`,
            `<img src="${escapeHtml(static_url)}" class="emoji" width="20" height="20" alt="Custom emoji: ${escapeHtml(shortcode)}">`
        )
    };
    return string;
}

function ExtractComment(fediFlavor, fediInstance, comment) {
    /*
    Return spec:
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
        reactionCount: "int",
        boostCount: "int",
        media: [{
            url: "url",
            sensitive: "bool",
            description: "string",
        }],
        content: "string?",
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
    switch (fediFlavor) {
        case 'mastodon':
            return ExtractMastodonComment(fediInstance, comment);
        case 'misskey':
            return ExtractMisskeyComment(fediInstance, comment);
        default:
            throw new Error("Unknown fedi flavor; could not extract comment", fediFlavor, fediInstance, comment);
    }
}


function ExtractMastodonComment(fediInstance, comment) {
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
        handle = `@${user.username}@${domain}`;
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
                userEmoji[reaction.name] = reaction.count;
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

function ExtractMisskeyComment(fediInstance, comment) {
    const user = comment.user;
    const domain = user.host || fediInstance;
    const handle = `@${user.username}@${domain}`;
    const attachments = [];
    const reactions = {"❤": 0};
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

    return {
        id: comment.id,
        replyId: comment.replyId,
        url: `https://${fediInstance}/notes/${comment.id}`,
        date: comment.createdAt,
        cw: comment.cw,
        emoji: {},  // TODO: MFM emoji
        reactionCount: comment.reactionCount,
        boostCount: comment.renoteCount,
        reactions: reactions,
        media: attachments,
        content: marked.parse(text),
        user: {
            host: domain,
            handle: handle,
            url: `https://${fediInstance}/${handle}`,
            name: user.name,
            avatar: user.avatarUrl,
            emoji: {}  // TODO: MFM emoji
        }
    };
}

function RenderComment(comment) {
    // TODO: better input sanitization
    if (document.getElementById(comment.id)) {
        return;
    }
    let str = `<div class="comment" id=${comment.id}>
        <div class="author">
            <div class="avatar">
                <img src="${comment.user.avatar}" height="30" width="30" alt="Avatar for ${escapeHtml(comment.user.name)}">
            </div>
            <a target="_blank" class="date" href="${comment.url}" rel="nofollow">
                ${new Date(comment.date).toLocaleString()}
            </a>
            <a target="_blank" href="${comment.user.url}" rel="nofollow">
                <span class="username">${replaceEmoji(escapeHtml(comment.user.name), comment.user.emoji)}</span> <span class="handle">(${comment.user.handle})</span>
            </a>
        </div>`;
    if (comment.cw) {
        str += `<details><summary>${replaceEmoji(escapeHtml(comment.cw), comment.emoji)}</summary>`;
    }
    str += `
        <div class="content">
            <div class="fedi-comment-content">${comment.content}</div>`;
    for (let attachment of (comment.media)) {
        str += `<img src="${attachment.url}" alt="${escapeHtml(attachment.description)}" class="attachment">`;
    }
    str += `
        </div>
        ${(comment.cw) ? "</details>" : ""}
        <div class="info"><img class="fediIcon" src="${like_link}" alt="Likes">${comment.reactionCount}, <img class="fediIcon" src="${boost_link}" alt="Boosts">${comment.boostCount}</div>
        <br>
    </div>`;
    const doc = parser.parseFromString(replaceEmoji(str, comment.emoji), 'text/html');
    const fragment = document.createDocumentFragment();
    Array.from(doc.body.childNodes).forEach(node => fragment.appendChild(node));
    return fragment;
}

function RenderCommentsBatch(comments) {
    if (!comments || comments.length === 0) return;

    const container = document.getElementById("comments-section");  // Main container
    if (!container) {
        console.error("Comment container not found");
        return;
    }

    comments.sort((a, b) => new Date(a.date) - new Date(b.date));
    console.log(comments);
    comments.forEach(comment => {
        const commentElement = RenderComment(comment);
        if (!commentElement) return;

        // Determine where to append the comment
        const parentElement = document.getElementById(comment.replyId) || container;
        parentElement.appendChild(commentElement); // Append immediately
    });
}

async function FetchMeta(fediFlavor, fediInstance, postId) {
    let response;
    let data;

    try {
        if (fediFlavor === 'misskey') {
            // Misskey has a different endpoint for fetching a post's details
            response = await fetch(`https://${fediInstance}/api/notes/show`, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ noteId: postId }),
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        } else if (fediFlavor === 'mastodon') {
            // Mastodon fetches a post's details using a GET request to /api/v1/statuses/:id
            response = await fetch(`https://${fediInstance}/api/v1/statuses/${postId}`);
        }

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        
        data = await response.json();

        // Depending on the platform, update the likes and reblogs count
        if (fediFlavor === 'misskey') {
            // Misskey API returns favorites_count and reblogs_count differently
            document.getElementById("global-likes").textContent = `${data.reactionCount}`;
            document.getElementById("global-reblogs").textContent = `${data.renoteCount}`;
        } else if (fediFlavor === 'mastodon') {
            document.getElementById("global-likes").textContent = `${data.favourites_count}`;
            document.getElementById("global-reblogs").textContent = `${data.reblogs_count}`;
        }

    } catch (error) {
        console.error("Error fetching post meta:", error);
    }
}


async function FetchComments(fediFlavor, fediInstance, postId, maxDepth) {
    try {
        FetchMeta(fediFlavor, fediInstance, postId);
        await FetchSubcomments(fediFlavor, fediInstance, postId, maxDepth);
    } catch (error) {
        console.error("Error fetching comments:", error);
    }
}

async function FetchSubcomments(fediFlavor, fediInstance, commentId, depth) {
    if (depth <= 0) return;

    try {
        const response = await (
            fediFlavor === 'misskey'
            ? fetch(`https://${fediInstance}/api/notes/children`, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    noteId: commentId,
                    limit: 100
                })
            })
            : fetch(`https://${fediInstance}/api/v1/statuses/${commentId}/context`)
        );

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const data = await response.json();
        const replies = (fediFlavor === 'misskey' ? data : data.descendants).map(
            comment => ExtractComment(fediFlavor, fediInstance, comment)
        );

        RenderCommentsBatch(replies);

        await Promise.all(replies.map(reply => FetchSubcomments(fediFlavor, fediInstance, reply.id, depth - 1)));
    } catch (error) {
        console.error(`Error fetching subcomments for ${commentId}:`, error);
    }
}
