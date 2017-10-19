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
	getId,
	convertPublicKeyEd2Curve,
	convertPrivateKeyEd2Curve,
} from '../../src/crypto/convert';

const hash = require('../../src/crypto/hash');
const utils = require('../../src/transactions/utils');

describe('convert', () => {
	// keys for secret 'secret';
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
	const defaultTransactionId = '13987348420913138422';
	const defaultTransactionHash = Buffer.from(
		'f60a26da470b1dc233fd526ed7306c1d84836f9e2ecee82c9ec47319e0910474',
		'hex',
	);
	const defaultStringWithMoreThanEightCharacters = '0123456789';
	const defaultFirstEightCharactersReversed = '76543210';
	const defaultDataForBuffer = 'Hello!';
	const defaultAddressFromBuffer = '79600447942433L';
	const defaultAmount = 1000;
	const defaultTimestamp = 141738;
	const defaultRecipientId = '58191285901858109L';
	const defaultSignature =
		'618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a';

	describe('#bufferToHex', () => {
		it('should create a hex string from a Buffer', () => {
			const hex = bufferToHex(defaultBuffer);
			hex.should.be.equal(defaultHex);
		});
	});

	describe('#hexToBuffer', () => {
		it('should create a Buffer from a hex string', () => {
			const buffer = hexToBuffer(defaultHex);
			buffer.should.be.eql(defaultBuffer);
		});
	});

	describe('#getFirstEightBytesReversed', () => {
		it('should get the first eight bytes reversed from a Buffer', () => {
			const bufferEntry = Buffer.from(defaultStringWithMoreThanEightCharacters);
			const reversedAndCut = getFirstEightBytesReversed(bufferEntry);
			reversedAndCut.should.be.eql(
				Buffer.from(defaultFirstEightCharactersReversed),
			);
		});

		it('should get the first eight bytes reversed from a string', () => {
			const reversedAndCut = getFirstEightBytesReversed(
				defaultStringWithMoreThanEightCharacters,
			);
			reversedAndCut.should.be.eql(
				Buffer.from(defaultFirstEightCharactersReversed),
			);
		});
	});

	describe('#toAddress', () => {
		it('should create an address from a buffer', () => {
			const bufferInit = Buffer.from(defaultDataForBuffer);
			const address = toAddress(bufferInit);
			address.should.be.eql(defaultAddressFromBuffer);
		});
	});

	describe('#getAddressFromPublicKey', () => {
		beforeEach(() => {
			sandbox.stub(hash, 'getSha256Hash').returns(defaultPublicKeyHash);
		});

		it('should generate address from publicKey', () => {
			const address = getAddressFromPublicKey(defaultPublicKey);
			address.should.be.equal(defaultAddress);
		});
	});

	describe('#getAddress', () => {
		beforeEach(() => {
			sandbox.stub(hash, 'getSha256Hash').returns(defaultPublicKeyHash);
		});

		it('should generate address from publicKey', () => {
			const address = getAddress(defaultPublicKey);
			address.should.be.equal(defaultAddress);
		});
	});

	describe('#getId', () => {
		beforeEach(() => {
			sandbox.stub(hash, 'getSha256Hash').returns(defaultTransactionHash);
			sandbox.stub(utils, 'getTransactionBytes');
		});

		it('should return an id of 13987348420913138422 for a transaction', () => {
			const transaction = {
				type: 0,
				amount: defaultAmount,
				recipientId: defaultRecipientId,
				timestamp: defaultTimestamp,
				asset: {},
				senderPublicKey: defaultPublicKey,
				signature: defaultSignature,
			};
			const id = getId(transaction);

			id.should.be.equal(defaultTransactionId);
		});
	});

	describe('#convertPublicKeyEd2Curve', () => {
		it('should convert publicKey ED25519 to Curve25519 key', () => {
			const curveRepresentation = convertPublicKeyEd2Curve(defaultPublicKey);
			defaultPublicKeyCurve
				.equals(Buffer.from(curveRepresentation))
				.should.be.true();
		});
	});

	describe('#convertPrivateKeyEd2Curve', () => {
		it('should convert privateKey ED25519 to Curve25519 key', () => {
			const curveRepresentation = convertPrivateKeyEd2Curve(defaultPrivateKey);
			defaultPrivateKeyCurve
				.equals(Buffer.from(curveRepresentation))
				.should.be.true();
		});
	});
});
