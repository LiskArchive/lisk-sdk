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
// Require is used for stubbing
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
		'68b211b2c01cc88690ba76a07895a5b4805e1c11fdd3af4c863e6d4efeb14378',
		'hex',
	);
	const defaultPublicKeyCurve = Buffer.from(
		'6f9d780305bda43dd47a291d897f2d8845a06160632d82fb1f209fdd46ed3c1e',
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
			return expect(hex).to.be.equal(defaultHex);
		});
	});

	describe('#hexToBuffer', () => {
		it('should create a Buffer from a hex string', () => {
			const buffer = hexToBuffer(defaultHex);
			return expect(buffer).to.be.eql(defaultBuffer);
		});

		it('should throw TypeError with number', () => {
			return expect(hexToBuffer.bind(null, 123)).to.throw(
				TypeError,
				'Argument must be a string.',
			);
		});

		it('should throw TypeError with object', () => {
			return expect(hexToBuffer.bind(null, {})).to.throw(
				TypeError,
				'Argument must be a string.',
			);
		});

		it('should throw TypeError with non hex string', () => {
			return expect(hexToBuffer.bind(null, 'yKJj')).to.throw(
				TypeError,
				'Argument must be a valid hex string.',
			);
		});

		it('should throw TypeError with partially correct hex string', () => {
			return expect(hexToBuffer.bind(null, 'Abxzzzz')).to.throw(
				TypeError,
				'Argument must be a valid hex string.',
			);
		});

		it('should throw TypeError with odd number of string with partially correct hex string', () => {
			return expect(hexToBuffer.bind(null, 'Abxzzab')).to.throw(
				TypeError,
				'Argument must be a valid hex string.',
			);
		});

		it('should throw TypeError with odd number hex string with invalid hex', () => {
			return expect(hexToBuffer.bind(null, '123xxxx')).to.throw(
				TypeError,
				'Argument must be a valid hex string.',
			);
		});

		it('should throw TypeError with odd number of hex string', () => {
			return expect(hexToBuffer.bind(null, 'c3a5c3a4c3b6a')).to.throw(
				TypeError,
				'Argument must have a valid length of hex string.',
			);
		});
	});

	describe('#getFirstEightBytesReversed', () => {
		it('should get the first eight bytes reversed from a Buffer', () => {
			const bufferEntry = Buffer.from(defaultStringWithMoreThanEightCharacters);
			const reversedAndCut = getFirstEightBytesReversed(bufferEntry);
			return expect(reversedAndCut).to.be.eql(
				Buffer.from(defaultFirstEightCharactersReversed),
			);
		});

		it('should get the first eight bytes reversed from a string', () => {
			const reversedAndCut = getFirstEightBytesReversed(
				defaultStringWithMoreThanEightCharacters,
			);
			return expect(reversedAndCut).to.be.eql(
				Buffer.from(defaultFirstEightCharactersReversed),
			);
		});
	});

	describe('#toAddress', () => {
		it('should create an address from a buffer', () => {
			const bufferInit = Buffer.from(defaultDataForBuffer);
			const address = toAddress(bufferInit);
			return expect(address).to.be.eql(defaultAddressFromBuffer);
		});
	});

	describe('#getAddressFromPublicKey', () => {
		beforeEach(() => {
			return sandbox.stub(hash, 'default').returns(defaultPublicKeyHash);
		});

		it('should generate address from publicKey', () => {
			const address = getAddressFromPublicKey(defaultPublicKey);
			return expect(address).to.be.equal(defaultAddress);
		});
	});

	describe('#getAddress', () => {
		beforeEach(() => {
			return sandbox.stub(hash, 'default').returns(defaultPublicKeyHash);
		});

		it('should generate address from publicKey', () => {
			const address = getAddress(defaultPublicKey);
			return expect(address).to.be.equal(defaultAddress);
		});
	});

	describe('#convertPublicKeyEd2Curve', () => {
		it('should convert publicKey ED25519 to Curve25519 key', () => {
			const curveRepresentation = convertPublicKeyEd2Curve(
				Buffer.from(defaultPublicKey, 'hex'),
			);
			return expect(
				defaultPublicKeyCurve.equals(Buffer.from(curveRepresentation)),
			).to.be.true;
		});
	});

	describe('#convertPrivateKeyEd2Curve', () => {
		it('should convert privateKey ED25519 to Curve25519 key', () => {
			const curveRepresentation = convertPrivateKeyEd2Curve(
				Buffer.from(defaultPrivateKey, 'hex'),
			);
			return expect(
				defaultPrivateKeyCurve.equals(Buffer.from(curveRepresentation)),
			).to.be.true;
		});
	});

	describe('#bigNumberToBuffer', () => {
		it('should convert a big number to a buffer', () => {
			const bigNumber = '58191285901858109';
			const addressSize = 8;
			const expectedBuffer = Buffer.from('00cebcaa8d34153d', 'hex');
			return expect(bigNumberToBuffer(bigNumber, addressSize)).to.be.eql(
				expectedBuffer,
			);
		});
	});

	describe('#bufferToBigNumberString', () => {
		it('should convert a buffer to a big number', () => {
			const bigNumber = '58191285901858109';
			const buffer = Buffer.from('00cebcaa8d34153d', 'hex');
			return expect(bufferToBigNumberString(buffer)).to.be.equal(bigNumber);
		});
	});
});
