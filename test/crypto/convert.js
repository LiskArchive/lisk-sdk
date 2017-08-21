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
import cryptoModule from '../../src/crypto/index';

describe('convert @now', () => {
	const defaultBuffer = naclInstance.encode_utf8('\xe5\xe4\xf6');
	const defaultHex = 'c3a5c3a4c3b6';
	describe('#bufferToHex', () => {
		it('should create Hex from Buffer type', () => {
			const hex = cryptoModule.bufferToHex(defaultBuffer);
			(hex).should.be.equal(defaultHex);
		});
	});

	describe('#hexToBuffer', () => {
		it('should create Buffer from Hex type', () => {
			const buffer = cryptoModule.hexToBuffer('68656c6c6f');
			(naclInstance.decode_utf8(buffer)).should.be.equal('hello');
		});
	});

	describe('#useFirstEightBufferEntriesReversed', () => {
		it('should use a Buffer, cut after first 8 entries and reverse them', () => {
			const bufferEntry = Buffer.from('0123456789');
			const reversedAndCut = cryptoModule.useFirstEightBufferEntriesReversed(bufferEntry);
			(reversedAndCut).should.be.eql(Buffer.from('76543210'));
		});
	});

	describe('#toAddress', () => {
		const bufferInit = Buffer.from('Hello!');
		const address = cryptoModule.toAddress(bufferInit);

		(address).should.be.eql('79600447942433L');
	});

	describe('#getId', () => {
		const getId = cryptoModule.getId;

		it('should be ok', () => {
			(getId).should.be.ok();
		});

		it('should be a function', () => {
			(getId).should.be.type('function');
		});

		it('should return string id and be equal to 13987348420913138422', () => {
			const transaction = {
				type: 0,
				amount: 1000,
				recipientId: '58191285901858109L',
				timestamp: 141738,
				asset: {},
				senderPublicKey: '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
				signature: '618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
			};

			const id = getId(transaction);
			(id).should.be.type('string').and.equal('13987348420913138422');
		});
	});

	describe('#getAddress', () => {
		const getAddress = cryptoModule.getAddress;

		it('should be ok', () => {
			(getAddress).should.be.ok();
		});

		it('should be a function', () => {
			(getAddress).should.be.type('function');
		});

		it('should generate address by publicKey', () => {
			const keys = cryptoModule.getKeys('secret');
			const address = getAddress(keys.publicKey);

			(address).should.be.ok();
			(address).should.be.type('string');
			(address).should.be.equal('18160565574430594874L');
		});
	});
});

