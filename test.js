import { createHash } from 'crypto';
import { Polly } from '@pollyjs/core';
import NodeHttpAdapter from '@pollyjs/adapter-node-http';
import FSPersister from '@pollyjs/persister-fs';
import fetch from 'node-fetch';
import { describe, it, before, after } from 'mocha';
import assert from 'assert';

// Setup Polly
Polly.register(NodeHttpAdapter);
Polly.register(FSPersister);

function hashString(input) {
  return createHash('sha256').update(input).digest('hex');
}

describe('fetch() with PollyJS', function () {
  let polly;

  before(function () {
    polly = new Polly('fetch test', {
      adapters: ['node-http'],
      persister: 'fs',
    });
  });

  after(async function () {
    await polly.stop();
  });

  it('should return recorded response', async function () {
    const response = await fetch('https://example.com');
    assert.ok(response.ok);
    assert.equal(hashString(await response.text()), 'ea8fac7c65fb589b0d53560f5251f74f9e9b243478dcb6b3ea79b5e36449c8d9');
  });
});
