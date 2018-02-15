/*
 * Copyright © 2017 Lisk Foundation
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
 *
 */
import {
	bufferToHex,
	hexToBuffer,
	getFirstEightBytesReversed,
	toAddress,
	getAddressFromPublicKey,
	getAddress,
	convertPublicKeyEd2Curve,
	convertPrivateKeyEd2Curve,
	bigNumberToBuffer,
	bufferToBigNumberString,
} from 'cryptography/convert';

const hash = require('cryptography/hash');

describe('convert', () => {
	// keys for passphrase 'secret';
	const defaultPrivateKey =
		'2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const defaultPublicKey =
		'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const defaultPublicKeyHash = Buffer.from(
		'3a971fd02b4a07fc20aad1936d3cb1d263b96e0ffd938625e5c0db1ad8ba2a29',
		'hex',
	);
	const defaultPrivateKeyCurve = Buffer.from(
		'6073c8f6198112b558bb5a98d150f3a0e35fb2b7a9c192cae1bbf37752df1950',
		'hex',
	);
	const defaultPublicKeyCurve = Buffer.from(
		'd4e56ce5d0c7e2d4a9f05813ba37882985ee13a3f511bc6f99b905b2f87cdf11',
		'hex',
	);
	const defaultAddress = '18160565574430594874L';
	const defaultBuffer = Buffer.from('\xe5\xe4\xf6');
	const defaultHex = 'c3a5c3a4c3b6';
	const defaultStringWithMoreThanEightCharacters = '0123456789';
	const defaultFirstEightCharactersReversed = '76543210';
	const defaultDataForBuffer = 'Hello!';
	const defaultAddressFromBuffer = '79600447942433L';

	describe('#bufferToHex', () => {
		it('should create a hex string from a Buffer', () => {
			const hex = bufferToHex(defaultBuffer);
			return hex.should.be.equal(defaultHex);
		});
	});

	describe('#hexToBuffer', () => {
		it('should create a Buffer from a hex string', () => {
			const buffer = hexToBuffer(defaultHex);
			return buffer.should.be.eql(defaultBuffer);
		});
		it('should throw TypeError with number', () => {
			return (() => hexToBuffer(123)).should.throw(
				new TypeError('argument must be string'),
			);
		});
		it('should throw TypeError with object', () => {
			return (() => hexToBuffer({})).should.throw(
				new TypeError('argument must be string'),
			);
		});
		it('should create empty Buffer from non hex string', () => {
			const buffer = hexToBuffer('yKJh');
			return buffer.should.be.eql(Buffer.alloc(0));
		});
		it('should create partial Buffer from partially non hex string', () => {
			const buffer = hexToBuffer('Abxzzzz');
			return buffer.should.be.eql(Buffer.from('Ab', 'hex'));
		});
		it('should create partial Buffer with only first valid hex string', () => {
			const buffer = hexToBuffer('Abxzzab');
			return buffer.should.be.eql(Buffer.from('Ab', 'hex'));
		});
		it('should create even numbered Buffer from odd number hex string', () => {
			const buffer = hexToBuffer('c3a5c3a4c3b6a');
			return buffer.should.be.eql(Buffer.from('c3a5c3a4c3b6', 'hex'));
		});
	});

	describe('#getFirstEightBytesReversed', () => {
		it('should get the first eight bytes reversed from a Buffer', () => {
			const bufferEntry = Buffer.from(defaultStringWithMoreThanEightCharacters);
			const reversedAndCut = getFirstEightBytesReversed(bufferEntry);
			return reversedAndCut.should.be.eql(
				Buffer.from(defaultFirstEightCharactersReversed),
			);
		});

		it('should get the first eight bytes reversed from a string', () => {
			const reversedAndCut = getFirstEightBytesReversed(
				defaultStringWithMoreThanEightCharacters,
			);
			return reversedAndCut.should.be.eql(
				Buffer.from(defaultFirstEightCharactersReversed),
			);
		});
	});

	describe('#toAddress', () => {
		it('should create an address from a buffer', () => {
			const bufferInit = Buffer.from(defaultDataForBuffer);
			const address = toAddress(bufferInit);
			return address.should.be.eql(defaultAddressFromBuffer);
		});
	});

	describe('#getAddressFromPublicKey', () => {
		beforeEach(() => {
			sandbox.stub(hash, 'default').returns(defaultPublicKeyHash);
		});

		it('should generate address from publicKey', () => {
			const address = getAddressFromPublicKey(defaultPublicKey);
			return address.should.be.equal(defaultAddress);
		});
	});

	describe('#getAddress', () => {
		beforeEach(() => {
			sandbox.stub(hash, 'default').returns(defaultPublicKeyHash);
		});

		it('should generate address from publicKey', () => {
			const address = getAddress(defaultPublicKey);
			return address.should.be.equal(defaultAddress);
		});
	});

	describe('#convertPublicKeyEd2Curve', () => {
		it('should convert publicKey ED25519 to Curve25519 key', () => {
			const curveRepresentation = convertPublicKeyEd2Curve(defaultPublicKey);
			return defaultPublicKeyCurve
				.equals(Buffer.from(curveRepresentation))
				.should.be.true();
		});
	});

	describe('#convertPrivateKeyEd2Curve', () => {
		it('should convert privateKey ED25519 to Curve25519 key', () => {
			const curveRepresentation = convertPrivateKeyEd2Curve(defaultPrivateKey);
			return defaultPrivateKeyCurve
				.equals(Buffer.from(curveRepresentation))
				.should.be.true();
		});
	});

	describe('#bigNumberToBuffer', () => {
		it('should convert a big number to a buffer', () => {
			const bigNumber = '58191285901858109';
			const addressSize = 8;
			const expectedBuffer = Buffer.from('00cebcaa8d34153d', 'hex');
			return bigNumberToBuffer(bigNumber, addressSize).should.be.eql(
				expectedBuffer,
			);
		});
	});

	describe('#bufferToBigNumberString', () => {
		it('should convert a buffer to a big number', () => {
			const bigNumber = '58191285901858109';
			const buffer = Buffer.from('00cebcaa8d34153d', 'hex');
			return bufferToBigNumberString(buffer).should.be.equal(bigNumber);
		});
	});
});
