import assert from 'assert';
import { createHash } from 'crypto';
import { createRequire } from 'module';

import { Polly } from '@pollyjs/core';
import NodeHttpAdapter from '@pollyjs/adapter-node-http';
import FSPersister from '@pollyjs/persister-fs';

import fetch from 'node-fetch';

import { describe, it, before, after } from 'mocha';

import { JSDOM } from 'jsdom';

import { marked } from 'marked';

import createDOMPurify from 'dompurify';

// Create a simulated DOM environment for DOMPurify
const { window } = new JSDOM("<!DOCTYPE html>");
const DOMPurify = createDOMPurify(window);

// Inject `marked` and `DOMPurify` into the global scope
globalThis.marked = marked;
globalThis.DOMPurify = DOMPurify;

// Setup Polly
Polly.register(NodeHttpAdapter);
Polly.register(FSPersister);
const require = createRequire(import.meta.url);
const oldFetch = fetch;
let polly;

function hashString(input) {
    return createHash('sha256').update(input).digest('hex');
}

before(function () {
    polly = new Polly('fetch test', {
        adapters: ['node-http'],
        persister: 'fs',
        recordFailedRequests: true,
    });
    globalThis.fetch = async function(url, options = {}) {
        const customHeaders = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:106.0) Gecko/20100101 Firefox/106.0",
            ...options.headers,
        };
        return fetch(url, { ...options, headers: customHeaders });
    };
});

after(async function () {
    globalThis.fetch = oldFetch;
    await polly.stop();
});

describe('fetch() with PollyJS', function () {
    it('should return recorded response', async function () {
        const response = await fetch('https://example.com');
        assert.ok(response.ok);
        assert.equal(
            hashString(await response.text()),
            'ea8fac7c65fb589b0d53560f5251f74f9e9b243478dcb6b3ea79b5e36449c8d9'
        );
    });
});

describe('Glue Script', function () {
    const glue = require("./fedi_script.js");

    it('should be able to change image links', async function () {
        glue.setImageLink('a');
        assert.equal(glue.config.boost_link, 'a');
    });
});

describe('Misskey Implementation', function () {
    const misskey = require("./fedi_script_misskey.js");

    it('should be able to fetch children of (transfem.social, a58960b3o5ko020v)', async function () {
        const instance = 'transfem.social';
        const id = 'a58960b3o5ko020v';
        const comments = await misskey.fetchSubcomments(instance, id);
        assert.ok(comments.length);
        assert.equal(comments[0].user.host, instance);
        assert.equal(comments[0].replyId, id);
    });

    it('should be able to sanitize basic Markdown', function() {
        const pairs = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '`': '&#96;',
            '"': '&quot;',
            '\'': '&#039;',
            '*': '&#42;',
            '<script>alert("YoU\'vE bEeN hAcKeD!!1!");</script>':
                '&lt;script&gt;alert(&quot;YoU&#039;vE bEeN hAcKeD!!1!&quot;);&lt;/script&gt;',
        };
        for (const key in pairs) {
            assert.equal(
                misskey.escapeHtml(key),
                pairs[key]
            )
        }
    });

    const emojiToTest = {
        Fire_Trans: [
            'transfem.social', '', 'https://cdn.transfem.social/files/c13d2be3-d57c-440e-9158-18ab5337b977.png'
        ],
        blobhaj: [
            'transfem.social', '', 'https://cdn.transfem.social/files/b4a56c87-45f1-4091-b93a-4c59c7039c68.webp'
        ],
        spinniercat: [
            'transfem.social', ' (delay from HTTP 429)',
            'https://cdn.transfem.social/files/4e422261-1fb5-4cc6-81ec-64b5e2628630.gif'
        ],
        axolotl_anger: [
            'transfem.social', ' (expected failure)', undefined
        ],
    };

    for (const shortcode in emojiToTest) {
        const [instance, note, url] = emojiToTest[shortcode];
        it(`should be able to fetch emoji (${instance}, ${shortcode})${note}`, async function () {
            assert.equal(
                (await misskey.fetchMisskeyEmoji(instance, shortcode))[shortcode],
                url
            );
        });
    }
});

describe('Mastodon Implementation', function () {
    const mastodon = require("./fedi_script_mastodon.js");

    it('should be able to fetch children of (tech.lgbt, 114032235423688612)', async function () {
        const instance = 'tech.lgbt';
        const id = '114032235423688612';
        const comments = await mastodon.fetchSubcomments(instance, id);
        assert.ok(comments.length);
        assert.equal(comments[0].user.host, instance);
        assert.equal(comments[0].replyId, id);
    });
});
