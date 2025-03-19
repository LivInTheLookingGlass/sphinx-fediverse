import { createHash } from 'crypto';
import { Polly } from '@pollyjs/core';
import NodeHttpAdapter from '@pollyjs/adapter-node-http';
import FSPersister from '@pollyjs/persister-fs';
import fetch from 'node-fetch';
import { describe, it, before, after } from 'mocha';
import assert from 'assert';
import { createRequire } from "module";
import { JSDOM } from "jsdom";
import { marked } from "marked";
import createDOMPurify from "dompurify";

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
let polly;
let oldFetch = fetch;

function hashString(input) {
    return createHash('sha256').update(input).digest('hex');
}

before(function () {
    polly = new Polly('fetch test', {
        adapters: ['node-http'],
        persister: 'fs',
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

describe('Misskey Implementation', function () {
    it('should be able to fetch (transfem.social, a58960b3o5ko020v)', async function () {
        const instance = 'transfem.social';
        const id = 'a58960b3o5ko020v';
        const misskey = require("./fedi_script_misskey.js");
        const comments = await misskey.fetchSubcomments(instance, id);
        assert.ok(comments.length);
        assert.equal(comments[0].user.host, instance);
        assert.equal(comments[0].replyId, id);
    });
});

describe('Mastodon Implementation', function () {
    it('should be able to fetch (tech.lgbt, 114032235423688612)', async function () {
        const instance = 'tech.lgbt';
        const id = '114032235423688612';
        const mastodon = require("./fedi_script_mastodon.js");
        const comments = await mastodon.fetchSubcomments(instance, id);
        assert.ok(comments.length);
        assert.equal(comments[0].user.host, instance);
        assert.equal(comments[0].replyId, id);
    });
});
