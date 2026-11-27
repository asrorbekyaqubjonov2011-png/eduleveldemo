import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { imageKitUrl } from './imageUrl';

describe('imageKitUrl', () => {
  test('adds a resize and format transform to ImageKit photos', () => {
    assert.equal(imageKitUrl('https://ik.imagekit.io/yqabjeno6/1000001027.jpg'), 'https://ik.imagekit.io/yqabjeno6/1000001027.jpg?tr=w-720%2Cq-80%2Cf-auto');
  });
  test('keeps an existing transform', () => {
    const u = 'https://ik.imagekit.io/x/a.jpg?tr=w-100';
    assert.equal(imageKitUrl(u), u);
  });
  test('other hosts and bad input are untouched', () => {
    assert.equal(imageKitUrl('https://example.com/a.jpg'), 'https://example.com/a.jpg');
    assert.equal(imageKitUrl('/uploads/x.png'), '/uploads/x.png');
  });
});
