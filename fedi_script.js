const parser = new DOMParser();

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function replaceEmoji(string, emojis) {
    // TODO: custom emoji support for misskey
    if (emojis.forEach !== undefined) {
        emojis.forEach(emoji => {
            string = string.replaceAll(
                `:${emoji.shortcode}:`,
                `<img src="${escapeHtml(emoji.static_url)}" class="emoji" width="20" height="20" alt="Custom emoji: ${escapeHtml(emoji.shortcode)}">`
            )
        });
    }
    return string;
}

function RenderComment(fediFlavor, fediInstance, comment) {
    // TODO: better input sanitization
    if (document.getElementById(comment.id)) {
        return;
    }
    const user = fediFlavor === 'misskey' ? comment.user : comment.account;
    let domain;
    if (fediFlavor === 'misskey') {
        domain = user.host || fediInstance;
    } else {
        const match = user.url.match(/https?:\/\/([^\/]+)/);
        domain = match ? match[1] : null;
    }
    let handle;
    if (!domain) {
        console.error("Could not extract domain name from url: " + user.url);
        handle = `@${user.username}`;
    } else {
        handle = `@${user.username}@${domain}`;
    }
    const commentUrl = (fediFlavor === 'misskey'
        ? `https://${fediInstance}/notes/${comment.id}`
        : comment.url
    )
    const userUrl = (fediFlavor === 'misskey'
        ? `https://${fediInstance}/${handle}`
        : user.url
    )
    let str = `<div class="comment" id=${comment.id}>
        <div class="author">
            <div class="avatar">
                <img src="${user.avatar_static || user.avatarUrl}" height="30" width="30" alt="Avatar for ${user.display_name || user.name}">
            </div>
            <a target="_blank" class="date" href="${commentUrl}" rel="nofollow">
                ${new Date(comment.created_at || comment.createdAt).toLocaleString()}
            </a>
            <a target="_blank" href="${userUrl}" rel="nofollow">
                <span class="username">${replaceEmoji(escapeHtml(user.display_name || user.name), user.emojis || [])}</span> <span class="handle">(${handle})</span>
            </a>
        </div>`;
    if (comment.sensitive) {
        str += `<details><summary>${comment.spoiler_text || comment.cw || ""}</summary>`;
    }
    str += `
        <div class="content">
            <div class="fedi-comment-content">${comment.content || comment.text}</div>`;
    for (let attachment of (comment.media_attachments || comment.files)) {
        if (attachment.type === 'image') {
            str += `<img src="${attachment.remote_url || attachment.url}" alt="${attachment.description}" class="attachment"`;
        }
    }
    str += `
        </div>
        ${(comment.sensitive || comment.cw) ? "</details>" : ""}
        <div class="info"><img src="_static/like.svg" alt="Likes">${comment.favourites_count || comment.reactionCount}, <img src="_static/boost.svg" alt="Boosts">${comment.reblogs_count || comment.renoteCount}</div>
        <br>
    </div>`;
    const doc = parser.parseFromString(replaceEmoji(str, comment.emojis || []), 'text/html');
    const fragment = document.createDocumentFragment();
    Array.from(doc.body.childNodes).forEach(node => fragment.appendChild(node));
    return fragment;
}

function RenderCommentsBatch(fediFlavor, fediInstance, comments) {
    if (!comments || comments.length === 0) return;

    const container = document.getElementById("comments-section");  // Main container
    if (!container) {
        console.error("Comment container not found");
        return;
    }

    comments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    console.log(comments);
    comments.forEach(comment => {
        const commentElement = RenderComment(fediFlavor, fediInstance, comment);
        if (!commentElement) return;

        // Determine where to append the comment
        const parentElement = document.getElementById(comment.in_reply_to_id) || container;
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
        
        // For Misskey, use POST method; For Mastodon, use GET method
        const contextUrl = fediFlavor === 'misskey' 
            ? `https://${fediInstance}/api/notes/children`
            : `https://${fediInstance}/api/v1/statuses/${postId}/context`;

        const response = await (fediFlavor === 'misskey'
            ? fetch(contextUrl, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    noteId: postId,
                    limit: 100
                })
            })  // TODO: support checking if there are more children
            : fetch(contextUrl)
        );

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const data = await response.json();
        const comments = fediFlavor === 'misskey' ? data : data.descendants;

        RenderCommentsBatch(fediFlavor, fediInstance, comments);

        // Fetch subcomments (children) for both Misskey and Mastodon
        await Promise.all(comments.map(comment => FetchSubcomments(fediFlavor, fediInstance, comment.id, maxDepth - 1)));
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
        const replies = fediFlavor === 'misskey' ? data : data.descendants;

        RenderCommentsBatch(fediFlavor, fediInstance, replies);

        await Promise.all(replies.map(reply => FetchSubcomments(fediFlavor, fediInstance, reply.id, depth - 1)));
    } catch (error) {
        console.error(`Error fetching subcomments for ${commentId}:`, error);
    }
}
