const parser = new DOMParser();
const emojiCache = {};
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

function escapeRegExp(string) {
    return string.replace(/[.*+?^=!:${}()|\[\]\/\\]/g, '\\$&'); // Escape regex special characters
}

function replaceEmoji(string, emojis) {
    // TODO: replace with more secure method
    // Problem: this needs to handle plain text in some places, but HTML in others
    // Maybe best to move this into ExtractComment?
    for (const shortcode in emojis) {
        const static_url = emojis[shortcode];
        string = string.replaceAll(
            `:${shortcode}:`,
            `<img src="${escapeHtml(static_url)}" class="emoji" alt="Custom emoji: ${escapeHtml(shortcode)}">`
        )
    };
    const container = document.createDocumentFragment();
    const newBody = parser.parseFromString(string, 'text/html');
    if (newBody.body.children.length) {
        Array.from(newBody.body.children).forEach(child => container.appendChild(child));
    } else {
        const span = document.createElement("span");
        span.innerHTML = string;  // This is okay as long as it gets sanitized inputs
        container.appendChild(span);
    }
    return container;
}

async function ExtractComment(fediFlavor, fediInstance, comment) {
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
        reactionEmoji: {
            name1: "url",
            name2: "url",
            ...
        }
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
    switch (fediFlavor) {
        case 'mastodon':
            return await ExtractMastodonComment(fediInstance, comment);
        case 'misskey':
            return await ExtractMisskeyComment(fediInstance, comment);
        default:
            throw new Error("Unknown fedi flavor; could not extract comment", fediFlavor, fediInstance, comment);
    }
}


async function ExtractMastodonComment(fediInstance, comment) {
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

async function ExtractMisskeyComment(fediInstance, comment) {
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
                .map(name => fetchMisskeyEmoji(fediInstance, name))
        );
        Object.assign(commentEmoji, ...pairs);
    }

    if (!user.emojis) {
        const pattern = /:([\w\p{L}][\w\p{L}\d\p{N}_]+):/gu;
        const pairs = await Promise.all(
            Array.from(user.name.matchAll(pattern))
                .map(match => match[1])
                .map(name => fetchMisskeyEmoji(fediInstance, name))
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
        if (response.ok) {
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

function RenderComment(comment) {
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
    avatar.setAttribute("alt", `Avatar for ${escapeHtml(comment.user.name)}`);
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
    userName.appendChild(replaceEmoji(escapeHtml(comment.user.name), comment.user.emoji));
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
        commentSummary.appendChild(replaceEmoji(escapeHtml(comment.cw), comment.emoji));
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
    boostIconImage.setAttribute("src", boost_link);
    boostIconImage.setAttribute("alt", "Boosts");
    boostIconImage.classList.add("fediIcon");
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
        const replies = await Promise.all(
            (fediFlavor === 'misskey' ? data : data.descendants).map(
                comment => ExtractComment(fediFlavor, fediInstance, comment)
            )
        );

        RenderCommentsBatch(replies);

        await Promise.all(replies.map(reply => FetchSubcomments(fediFlavor, fediInstance, reply.id, depth - 1)));
    } catch (error) {
        console.error(`Error fetching subcomments for ${commentId}:`, error);
    }
}
