const parser = new DOMParser();
let like_link = "_static/like.svg";
let boost_link = "_static/boost.svg";

function setImageLinks(new_like_link, new_boost_link) {
    like_link = new_like_link;
    boost_link = new_boost_link;
}

function replaceEmoji(string, emojis) {
    for (const shortcode in emojis) {
        const static_url = emojis[shortcode];
        string = string.replaceAll(
            `:${shortcode}:`,
            `<img src="${DOMPurify.sanitize(static_url)}" class="emoji" alt="Custom emoji: ${DOMPurify.sanitize(shortcode)}">`
        )
    };
    const container = document.createDocumentFragment();
    const newBody = parser.parseFromString(DOMPurify.sanitize(string), 'text/html');
    if (newBody.body.children.length) {
        Array.from(newBody.body.children).forEach(child => container.appendChild(child));
    } else {
        const span = document.createElement("span");
        span.innerHTML = DOMPurify.sanitize(string);
        container.appendChild(span);
    }
    return container;
}

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

async function fetchMeta(fediFlavor, fediInstance, postId) {
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


async function fetchComments(fediFlavor, fediInstance, postId, maxDepth) {
    try {
        fetchMeta(fediFlavor, fediInstance, postId);
        await fetchSubcomments(fediFlavor, fediInstance, postId, maxDepth);
    } catch (error) {
        console.error("Error fetching comments:", error);
    }
}

async function fetchSubcomments(fediFlavor, fediInstance, commentId, depth) {
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
                comment => extractComment(fediInstance, comment)
            )
        );

        renderCommentsBatch(replies);

        await Promise.all(replies.map(reply => fetchSubcomments(fediFlavor, fediInstance, reply.id, depth - 1)));
    } catch (error) {
        console.error(`Error fetching subcomments for ${commentId}:`, error);
    }
}
