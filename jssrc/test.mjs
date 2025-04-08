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

const minimalRenderableComment = {
	'user': {
		'emoji': {},
	},
	'media': [],
	'reactions': {},
	'emoji': {},
	'reactionEmoji': {},
};

function hashString(input) {
	return createHash('sha256').update(input).digest('hex');
}

before(function () {
	polly = new Polly('fetch test', {
		adapters: ['node-http'],
		persister: 'fs',
		recordFailedRequests: true,
	});
	globalThis.document = window.document;
	globalThis.window = window;
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
	const misskey = require("./fedi_script_misskey.js");

	it('should be able to fetch children of (transfem.social, a58960b3o5ko020v)', async function () {
		const instance = 'transfem.social';
		const id = 'a58960b3o5ko020v';
		const comments = await misskey.fetchSubcommentsMisskey(instance, id);
		assert.ok(comments.length);
		assert.equal(comments[0].user.host, instance);
		assert.equal(comments[0].replyId, id);
	});

	it('should be able to sanitize basic Markdown', function() {
		const pairs = [
			['&', '&amp;'],
			['<', '&lt;'],
			['>', '&gt;'],
			['`', '&#96;'],
			['"', '&quot;'],
			['\'', '&#039;'],
			['*', '&#42;'],
			['@', '&#64;'],
			['#', '&#35;'],
			['<script>alert("YoU\'vE bEeN hAcKeD!!1!");</script>',
				'&lt;script&gt;alert(&quot;YoU&#039;vE bEeN hAcKeD!!1!&quot;);&lt;/script&gt;'],
		];
		for (const [key, value] of pairs) {
			assert.equal(
				misskey.escapeHtml(key),
				value
			)
		}
	});

	it('should be able to transform MFM to Markdown', function() {
		const pairs = [
			['#test',                                     '[#test](https://[::1]/tags/test)'],
			['[#test](https://[::1]/tags/test)',          '[#test](https://[::1]/tags/test)'],
			['<plain>a</plain>',                          'a'],
			['<plain><plain>a</plain></plain>',           '&lt;plain&gt;a&lt;/plain&gt;'],
			['<plain>#test</plain>',                      '&#35;test'],
			['<small>a</small>',                          '<sub>a</sub>'],
			['<i>test</i>',                               '*test*'],
			['<i>\ntest\n</i>',                           '<i>\ntest\n</i>'],
			['?[.](.)',                                   '[.](.)'],
			['@test',                                     '[@test](https://[::1]/@test)'],
			['@test@test',                                '[@test@test](https://[::1]/@test@test)'],
			['@1234',                                     '[@1234](https://[::1]/@1234)'],
			['[@1234](https://[::1]/@1234)',              '[@1234](https://[::1]/@1234)'],
			['<center>a</center>',                        '<div style="text-align: center;">a</div>'],
			['$[flip x]',                                 '<span style="transform: scaleX(-1);">x</span>'],
			['$[flip.h x]',                               '<span style="transform: scaleX(-1);">x</span>'],
			['$[flip.h,h,h,h,h x]',                       '<span style="transform: scaleX(-1);">x</span>'],
			['$[flip.v y]',                               '<span style="transform: scaleY(-1);">y</span>'],
			['$[flip.v,v,v,v,v y]',                       '<span style="transform: scaleY(-1);">y</span>'],
			['$[flip.h,v xy]',                            '<span style="transform: scale(-1, -1);">xy</span>'],
			['$[flip.v,h xy]',                            '<span style="transform: scale(-1, -1);">xy</span>'],
			['$[flip.h,v,v xy]',                          '<span style="transform: scale(-1, -1);">xy</span>'],
			['$[flip.h,v,v,h xy]',                        '<span style="transform: scale(-1, -1);">xy</span>'],
			['$[flip.v,h,h xy]',                          '<span style="transform: scale(-1, -1);">xy</span>'],
			['$[flip.v,h,h,v xy]',                        '<span style="transform: scale(-1, -1);">xy</span>'],
			['$[blur text]',                              '<span style="filter: blur(3px);">text</span>'],
			['$[ruby 明日 Ashita]',                         '<ruby>明日 <rp>(</rp><rt>Ashita</rt><rp>)</rp></ruby>'],
			['$[bg.color=f00 foo]',                       '<span style="background-color=#f00;">foo</span>'],
			['$[fg.color=ba1 bar]',                       '<span style="color=#ba1;">bar</span>'],
			['$[x2 foo]',                                 '<span style="transform: scale(2, 2);">foo</span>'],
			['$[x4 bar]',                                 '<span style="transform: scale(4, 4);">bar</span>'],
			['$[scale.x=4,y=2 foobar]',                   '<span style="transform: scale(4, 2);">foobar</span>'],
			['$[scale.y=4,x=2 foobaz]',                   '<span style="transform: scale(2, 4);">foobaz</span>'],
			['$[font.sans-serif test]',                   '<span style="font-family: sans-serif;">test</span>'],
			['$[font.serif test]',                        '<span style="font-family: serif;">test</span>'],
			['$[font.monospace test]',                    '<span style="font-family: monospace;">test</span>'],
			['$[font.cursive test]',                      '<span style="font-family: cursive;">test</span>'],
			['$[font.fantasy test]',                      '<span style="font-family: fantasy;">test</span>'],
			['$[font.unknown test]',                      '$[font.unknown test]'],
			['$[border.style=solid,width=4 Default]',
				'<span style="border: 4px solid #86b300; border-radius: 0px; overflow: clip;">Default</span>'],
			['$[border.style=hidden No border]',
				'<span style="border: 1px hidden #86b300; border-radius: 0px; overflow: clip;">No border</span>'],
			['$[border.style=dotted,width=2 Dotted]',
				'<span style="border: 2px dotted #86b300; border-radius: 0px; overflow: clip;">Dotted</span>'],
			['$[border.style=dashed,width=2 Dashed]',
				'<span style="border: 2px dashed #86b300; border-radius: 0px; overflow: clip;">Dashed</span>'],
			['$[border.style=double,width=4 Double]',
				'<span style="border: 4px double #86b300; border-radius: 0px; overflow: clip;">Double</span>'],
			['$[border.style=groove,width=4 Embossed A]',
				'<span style="border: 4px groove #86b300; border-radius: 0px; overflow: clip;">Embossed A</span>'],
			['$[border.style=ridge,width=4 Embossed B]',
				'<span style="border: 4px ridge #86b300; border-radius: 0px; overflow: clip;">Embossed B</span>'],
			['$[border.style=inset,width=4 Inset A]',
				'<span style="border: 4px inset #86b300; border-radius: 0px; overflow: clip;">Inset A</span>'],
			['$[border.style=outset,width=4 Inset B]',
				'<span style="border: 4px outset #86b300; border-radius: 0px; overflow: clip;">Inset B</span>'],
			['$[border.color=d00 Border color]',
				'<span style="border: 1px solid #d00; border-radius: 0px; overflow: clip;">Border color</span>'],
			['$[border.width=5 Border width]',
				'<span style="border: 5px solid #86b300; border-radius: 0px; overflow: clip;">Border width</span>'],
			['$[border.radius=6,width=2 Border radius]',
				'<span style="border: 2px solid #86b300; border-radius: 6px; overflow: clip;">Border radius</span>'],

			// TODO: combinations of more elements
		];
		for (const [key, value] of pairs) {
			assert.equal(
				misskey.transformMFM(key, '[::1]'),
				value
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

	for (const [instance, handle] of [
		['transfem.social', '@LivInTheLookingGlass@tech.lgbt'],
		['transfem.social', '@LivInTheLookingGlass@transfem.social']
	]) {
		it(`should be able to query a user (${instance}, ${handle})`, async function() {
			const userInfo = await misskey.queryUserMisskey(instance, handle);
			assert.ok(userInfo);
			assert.ok(userInfo.url);
			assert.ok(userInfo.flavor.endsWith(handle.contains('tech.lgbt') ? 'mastodon' : 'key'));
		});
	}
});

describe('Mastodon Implementation', function () {
	const mastodon = require("./fedi_script_mastodon.js");

	it('should be able to fetch children of (tech.lgbt, 114032235423688612)', async function () {
		const instance = 'tech.lgbt';
		const id = '114032235423688612';
		const comments = await mastodon.fetchSubcommentsMastodon(instance, id);
		assert.ok(comments.length);
		assert.equal(comments[0].user.host, instance);
		assert.equal(comments[0].replyId, id);
	});

	for (const [instance, handle] of [
		['tech.lgbt', '@LivInTheLookingGlass@tech.lgbt'],
		['tech.lgbt', '@LivInTheLookingGlass@transfem.social']
	]) {
		it(`should be able to query a user (${instance}, ${handle})`, async function() {
			const userInfo = await mastodon.queryUserMastodon(instance, handle);
			assert.ok(userInfo);
			assert.ok(userInfo.url);
			assert.ok(userInfo.flavor.endsWith(handle.contains('tech.lgbt') ? 'mastodon' : 'key'));
		});
	}
});

describe('Glue Script', function () {
	const glue = require("./fedi_script.js");
	const misskey = require("./fedi_script_misskey.js");

	before(() => {
		glue.config.parser = new window.DOMParser();
	})

	it('should be able to change image links', async function () {
		glue.setImageLink('a');
		assert.equal(glue.config.boost_link, 'a');
	});

	it('should be able to render emoji', async function() {
		const emoji = await misskey.fetchMisskeyEmoji('transfem.social', 'blobhaj');
		for (const str of [
			':blobhaj:',
			'::blobhaj::',
			'<html><body>:blobhaj:</body></html>',
		]) {
			const container = glue.replaceEmoji(str, emoji);
			assert.equal(
				container.querySelector('img').src,
				emoji['blobhaj']
			);
		}
	});

	describe('Renderer', function() {

		it('should render handles inside a link', async function() {
			const comment = structuredClone(minimalRenderableComment);
			comment['user']['handle'] = '@test@example.com';
			const parsed = glue.renderComment(comment);
			const handle = parsed.querySelector('.comment .author a .handle');
			assert.equal(
				handle.innerText,
				comment.user.handle
			);
		});

		it('should recognize content warnings', async function() {
			const comment = structuredClone(minimalRenderableComment);
			let parsed = glue.renderComment(comment);
			let cw = parsed.querySelector('.comment details summary');
			assert.equal(
				cw,
				null
			);
			comment['cw'] = 'This is a test';
			parsed = glue.renderComment(comment);
			cw = parsed.querySelector('.comment details summary');
			assert.ok(
				cw.innerHTML.includes(comment.cw)
			);
		});

	});

});
