/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

'use strict';

var crypto = require('crypto');
var ed = require('../../../helpers/ed');

describe('ed', () => {
	describe('makeKeypair', () => {
		var keys;

		before(done => {
			var randomstring = 'ABCDE';
			var hash = crypto
				.createHash('sha256')
				.update(randomstring, 'utf8')
				.digest();
			keys = ed.makeKeypair(hash);
			done();
		});

		it('should create keypair from a random string', done => {
			expect(keys).to.have.a.property('privateKey');
			expect(keys).to.have.a.property('publicKey');
			done();
		});

		it('should create a publicKey as a Buffer type', done => {
			expect(Buffer.isBuffer(keys.publicKey)).to.be.ok;
			done();
		});

		it('should create a privateKey should have be a Buffer type', done => {
			expect(Buffer.isBuffer(keys.privateKey)).to.be.ok;
			done();
		});
	});

	describe('sign', () => {
		var keys;
		var messageToSign = {
			field: 'value',
		};

		before(done => {
			var randomstring = 'ABCDE';
			var hash = crypto
				.createHash('sha256')
				.update(randomstring, 'utf8')
				.digest();
			keys = ed.makeKeypair(hash);
			done();
		});

		it('should create signature as Buffer from data as Buffer and privateKey', done => {
			var signature = ed.sign(
				Buffer.from(JSON.stringify(messageToSign)),
				keys.privateKey
			);
			expect(Buffer.isBuffer(signature)).to.be.ok;
			done();
		});

		it('should create signature as Buffer from data as Buffer and a privateKey after Buffer.from function applied on it', done => {
			var signature = ed.sign(
				Buffer.from(JSON.stringify(messageToSign)),
				Buffer.from(keys.privateKey, 'hex')
			);
			expect(Buffer.isBuffer(signature)).to.be.ok;
			done();
		});

		it('should throw error when passing string as message to sign', done => {
			expect(
				ed.sign.bind(null, JSON.stringify(messageToSign), keys.privateKey)
			).to.throw('argument message must be a buffer');
			done();
		});

		it('should throw error when passing JSON as message to sign', done => {
			expect(ed.sign.bind(null, messageToSign, keys.privateKey)).to.throw(
				'argument message must be a buffer'
			);
			done();
		});
	});

	describe('verify', () => {
		var keys;
		var signature;
		var messageToSign = {
			field: 'value',
		};

		before(done => {
			var randomstring = 'ABCDE';
			var hash = crypto
				.createHash('sha256')
				.update(randomstring, 'utf8')
				.digest();
			keys = ed.makeKeypair(hash);
			signature = ed.sign(
				Buffer.from(JSON.stringify(messageToSign)),
				keys.privateKey
			);
			done();
		});

		it('should return true when valid Buffer signature is checked with matching Buffer public key and valid Buffer message', done => {
			var verified = ed.verify(
				Buffer.from(JSON.stringify(messageToSign)),
				signature,
				keys.publicKey
			);
			expect(verified).to.be.ok;
			done();
		});

		it('should return false when malformed signature is checked with Buffer public key', done => {
			var wrongSignature = ed.sign(
				Buffer.from(JSON.stringify('wrong message')),
				keys.privateKey
			);
			var verified = ed.verify(
				Buffer.from(JSON.stringify(messageToSign)),
				wrongSignature,
				keys.publicKey
			);
			expect(verified).not.to.be.ok;
			done();
		});

		it('should return false proper signature and proper publicKey is check against malformed data', done => {
			var verified = ed.verify(
				Buffer.from('malformed data'),
				signature,
				keys.publicKey
			);
			expect(verified).not.to.be.ok;
			done();
		});

		it('should throw an error when proper non hex string signature is checked with matching string hex public key', done => {
			expect(
				ed.verify.bind(
					null,
					Buffer.from(JSON.stringify(messageToSign)),
					signature.toString(),
					keys.publicKey.toString('hex')
				)
			).to.throw();
			done();
		});

		it('should throw an error when proper non hex string signature is checked with matching string non hex public key', done => {
			expect(
				ed.verify.bind(
					null,
					Buffer.from(JSON.stringify(messageToSign)),
					signature.toString('hex'),
					keys.publicKey.toString()
				)
			).to.throw();
			done();
		});
	});

	describe('hexToString', () => {
		it('should throw error if the hex is not a string', () => {
			const buff = new Buffer.from('ABC', 'utf8');
			return expect(() => ed.hexToBuffer(buff)).to.throw(
				'Argument must be a string.'
			);
		});

		it('should throw error if the hex string has invalid characters', () => {
			const hex =
				'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6z';
			return expect(() => ed.hexToBuffer(hex)).to.throw(
				'Argument must be a valid hex string.'
			);
		});

		it('should throw error if the hex string has invalid number of characters', () => {
			const hex =
				'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f0';
			return expect(() => ed.hexToBuffer(hex)).to.throw(
				'Argument must be a valid hex string.'
			);
		});

		it('should return buffer for a valid hex string', () => {
			const hex =
				'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f';
			return expect(ed.hexToBuffer(hex)).to.be.an.instanceof(Buffer);
		});

		it('should return buffer for a valid hex string with capital letters', () => {
			const hex =
				'C094EBEE7EC0C50EBEE32918655E089F6E1A604B83BCAA760293C61E0F18AB6F';
			return expect(ed.hexToBuffer(hex)).to.be.an.instanceof(Buffer);
		});
	});
});
