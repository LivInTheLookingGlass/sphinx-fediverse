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
    emojis.forEach(emoji => {
        string = string.replaceAll(
            `:${emoji.shortcode}:`,
            `<img src="${escapeHtml(emoji.static_url)}" class="emoji" width="20" height="20" alt="Custom emoji: ${escapeHtml(emoji.shortcode)}">`
        )
    });
    return string;
}

function RenderComment(comment) {
    // TODO: better input sanitization
    if (document.getElementById(comment.id)) {
        return;
    }
    const match = comment.account.url.match(/https?:\/\/([^\/]+)/);
    const domain = match ? match[1] : null;
    let handle;
    if (!domain) {
        console.error("Could not extract domain name from url: " + comment.account.url);
        handle = `@${comment.account.username}`;
    } else {
        handle = `@${comment.account.username}@${domain}`;
    }
    let str = `<div class="comment" id=${comment.id}>
        <div class="author">
            <div class="avatar">
                <img src="${comment.account.avatar_static}" height="30" width="30" alt="Avatar for ${comment.account.display_name}">
            </div>
            <a target="_blank" class="date" href="${comment.url}" rel="nofollow">
                ${new Date(comment.created_at).toLocaleString()}
            </a>
            <a target="_blank" href="${comment.account.url}" rel="nofollow">
                <span class="username">${replaceEmoji(escapeHtml(comment.account.display_name), comment.account.emojis)}</span> <span class="handle">(${handle})</span>
            </a>
        </div>`;
    if (comment.sensitive) {
        str += `<details><summary>${comment.spoiler_text}</summary>`;
    }
    str += `
        <div class="content">
            <div class="mastodon-comment-content">${comment.content}</div>`;
    for (let attachment of comment.media_attachments) {
        if (attachment.type === 'image') {
            str += `<img src="${attachment.remote_url || attachment.url}" alt="${attachment.description}" class="attachment"`;
        }
    }
    str += `
        </div>
        ${comment.sensitive ? "</details>" : ""}
        <div class="info"><img src="_static/like.svg" alt="Likes">${comment.favourites_count}, <img src="_static/boost.svg" alt="Boosts">${comment.reblogs_count}</div>
        <br>
    </div>`;
    const doc = parser.parseFromString(replaceEmoji(str, comment.emojis), 'text/html');
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

    comments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    console.log(comments);
    comments.forEach(comment => {
        const commentElement = RenderComment(comment);
        if (!commentElement) return;

        // Determine where to append the comment
        const parentElement = document.getElementById(comment.in_reply_to_id) || container;
        parentElement.appendChild(commentElement); // Append immediately
    });
}

async function FetchMeta(postId) {
    const response = await fetch(`https://tech.lgbt/api/v1/statuses/${postId}`);
    const data = await response.json();
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    document.getElementById("global-likes").textContent = `${data.favourites_count}`;
    document.getElementById("global-reblogs").textContent = `${data.reblogs_count}`;
}

async function FetchComments(postId, maxDepth) {
    try {
        FetchMeta(postId);
        const response = await fetch(`https://tech.lgbt/api/v1/statuses/${postId}/context`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const data = await response.json();
        const comments = data.descendants;

        RenderCommentsBatch(comments);

        await Promise.all(comments.map(comment => FetchSubcomments(comment.id, maxDepth - 1)));
    } catch (error) {
        console.error("Error fetching comments:", error);
    }
}

async function FetchSubcomments(commentId, depth) {
    if (depth <= 0) return;

    try {
        const response = await fetch(`https://tech.lgbt/api/v1/statuses/${commentId}/context`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const data = await response.json();
        const replies = data.descendants;

        RenderCommentsBatch(replies);

        await Promise.all(replies.map(reply => FetchSubcomments(reply.id, depth - 1)));
    } catch (error) {
        console.error(`Error fetching subcomments for ${commentId}:`, error);
    }
}
