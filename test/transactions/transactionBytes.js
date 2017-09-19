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
import { getTransactionBytes } from '../../src/transactions/transactionBytes';

describe('#getTransactionBytes', () => {
	const defaultRecipient = '58191285901858109L';
	const defaultSenderPublicKey = '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const defaultSenderSecondPublicKey = '0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f';
	const defaultAmount = 1000;
	const defaultNoAmount = 0;
	const defaultTimestamp = 141738;
	const defaultTransactionId = '13987348420913138422';
	const defaultSignature = '618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a';
	const defaultSecondSignature = 'b00c4ad1988bca245d74435660a278bfe6bf2f5efa8bda96d927fabf8b4f6fcfdcb2953f6abacaa119d6880987a55dea0e6354bc8366052b45fa23145522020f';
	const defaultAppId = '1234213';

	describe.only('send transaction, type 0', () => {
		let defaultTransaction;

		beforeEach(() => {
			defaultTransaction = {
				type: 0,
				amount: defaultAmount,
				recipientId: defaultRecipient,
				timestamp: defaultTimestamp,
				asset: {},
				senderPublicKey: defaultSenderPublicKey,
				signature: defaultSignature,
				id: defaultTransactionId,
			};
		});

		it('should return Buffer of type 0 (send LSk) transaction', () => {
			const expectedBuffer = Buffer.from('AKopAgBdA2qFjOifhESRdi64niv71QpKCg2mWOSyYoslsReuCQDOvKqNNBU96AMAAAAAAABhilSXUhLq2T34yIFlXGJVRLzo7XzN/m8IpC7s+xrevQUTB75QFLsFFhe694FdUPYhKecJGBkDYeXU3UeWVBsK', 'base64');
			const transactionBytes = getTransactionBytes(defaultTransaction);

			(transactionBytes).should.be.eql(expectedBuffer);
		});

		it('should return Buffer of type 0 (send LSk) with data', () => {
			defaultTransaction.asset.data = 'Hello Lisk! Some data in here!...';
			const expectedBuffer = Buffer.from('AKopAgBdA2qFjOifhESRdi64niv71QpKCg2mWOSyYoslsReuCQDOvKqNNBU96AMAAAAAAABIZWxsbyBMaXNrISBTb21lIGRhdGEgaW4gaGVyZSEuLi5hilSXUhLq2T34yIFlXGJVRLzo7XzN/m8IpC7s+xrevQUTB75QFLsFFhe694FdUPYhKecJGBkDYeXU3UeWVBsK', 'base64');
			const transactionBytes = getTransactionBytes(defaultTransaction);

			(transactionBytes).should.be.eql(expectedBuffer);
		});

		it('should throw on type 0 with too much data', () => {
			defaultTransaction.asset.data = '0123456789012345678901234567890123456789012345678901234567890123456789';
			(getTransactionBytes.bind(null, defaultTransaction)).should.throw('Transaction asset data exceeds size of 64.');
		});

		it('should return Buffer of transaction with second signature', () => {
			defaultTransaction.signSignature = defaultSecondSignature;
			const expectedBuffer = Buffer.from('AKopAgBdA2qFjOifhESRdi64niv71QpKCg2mWOSyYoslsReuCQDOvKqNNBU96AMAAAAAAABhilSXUhLq2T34yIFlXGJVRLzo7XzN/m8IpC7s+xrevQUTB75QFLsFFhe694FdUPYhKecJGBkDYeXU3UeWVBsKsAxK0ZiLyiRddENWYKJ4v+a/L176i9qW2Sf6v4tPb8/cspU/arrKoRnWiAmHpV3qDmNUvINmBStF+iMUVSICDw==', 'base64');
			const transactionBytes = getTransactionBytes(defaultTransaction);

			(transactionBytes).should.be.eql(expectedBuffer);
		});
	});

	describe('signature transaction, type 1', () => {
		const signatureTransaction = {
			type: 1,
			amount: defaultNoAmount,
			fee: 500000000,
			recipientId: null,
			senderPublicKey: defaultSenderPublicKey,
			timestamp: defaultTimestamp,
			asset: { signature: { publicKey: defaultSenderSecondPublicKey } },
			signature: defaultSignature,
			id: defaultTransactionId,
		};

		it('should create correct transactionBytes from signature transaction', () => {
			const expectedBuffer = Buffer.from('AaopAgBdA2qFjOifhESRdi64niv71QpKCg2mWOSyYoslsReuCQAAAAAAAAAAAAAAAAAAAAAEAcisnyne2eHk1ba0MFHLJbIvJ8e3s1CSFh6FGUb4L2GKVJdSEurZPfjIgWVcYlVEvOjtfM3+bwikLuz7Gt69BRMHvlAUuwUWF7r3gV1Q9iEp5wkYGQNh5dTdR5ZUGwo=', 'base64');
			const transactionBytes = getTransactionBytes(signatureTransaction);

			(transactionBytes).should.be.eql(expectedBuffer);
		});
	});

	describe('delegate registration transaction, type 2', () => {
		const delegateRegistrationTransaction = {
			type: 2,
			amount: defaultNoAmount,
			fee: 2500000000,
			recipientId: null,
			senderPublicKey: defaultSenderPublicKey,
			timestamp: defaultTimestamp,
			asset: { delegate: { username: 'MyDelegateUsername' } },
			signature: defaultSignature,
			id: defaultTransactionId,
		};

		it('should create correct transactionBytes from delegate registration transaction', () => {
			const expectedBuffer = Buffer.from('AqopAgBdA2qFjOifhESRdi64niv71QpKCg2mWOSyYoslsReuCQAAAAAAAAAAAAAAAAAAAABNeURlbGVnYXRlVXNlcm5hbWVhilSXUhLq2T34yIFlXGJVRLzo7XzN/m8IpC7s+xrevQUTB75QFLsFFhe694FdUPYhKecJGBkDYeXU3UeWVBsK', 'base64');
			const transactionBytes = getTransactionBytes(delegateRegistrationTransaction);

			(transactionBytes).should.be.eql(expectedBuffer);
		});
	});

	describe('vote transaction, type 3', () => {
		const voteTransaction = {
			type: 3,
			amount: 0,
			fee: 100000000,
			recipientId: '18160565574430594874L',
			senderPublicKey: defaultSenderPublicKey,
			timestamp: defaultTimestamp,
			asset: {
				votes: [
					`+${defaultSenderPublicKey}`,
					`+${defaultSenderSecondPublicKey}`,
				],
			},
			signature: defaultSignature,
			id: defaultTransactionId,
		};

		it('should create correct transactionBytes from vote transaction', () => {
			const expectedBuffer = Buffer.from('A6opAgBdA2qFjOifhESRdi64niv71QpKCg2mWOSyYoslsReuCfwHSivQH5c6AAAAAAAAAAArNWQwMzZhODU4Y2U4OWY4NDQ0OTE3NjJlYjg5ZTJiZmJkNTBhNGEwYTBkYTY1OGU0YjI2MjhiMjViMTE3YWUwOSswNDAxYzhhYzlmMjlkZWQ5ZTFlNGQ1YjZiNDMwNTFjYjI1YjIyZjI3YzdiN2IzNTA5MjE2MWU4NTE5NDZmODJmYYpUl1IS6tk9+MiBZVxiVUS86O18zf5vCKQu7Psa3r0FEwe+UBS7BRYXuveBXVD2ISnnCRgZA2Hl1N1HllQbCg==', 'base64');
			const transactionBytes = getTransactionBytes(voteTransaction);

			(transactionBytes).should.be.eql(expectedBuffer);
		});
	});

	describe('multisignature transaction, type 4', () => {
		const createMultiSignatureTransaction = {
			type: 4,
			amount: 0,
			fee: 1500000000,
			recipientId: null,
			senderPublicKey: defaultSenderPublicKey,
			timestamp: defaultTimestamp,
			asset: {
				multisignature:
				{
					min: 2,
					lifetime: 5,
					keysgroup: [
						`+${defaultSenderPublicKey}`,
						`+${defaultSenderSecondPublicKey}`,
					],
				},
			},
			signature: defaultSignature,
			id: defaultTransactionId,
		};

		const multiSignatureTransaction = {
			type: 0,
			amount: 1000,
			fee: 10000000,
			recipientId: defaultRecipient,
			senderPublicKey: defaultSenderPublicKey,
			requesterPublicKey: '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
			timestamp: defaultTimestamp,
			asset: {},
			signatures: [],
			signature: defaultSignature,
			id: defaultTransactionId,
		};

		it('should create correct transactionBytes from create multisignature transaction', () => {
			const expectedBuffer = Buffer.from('BKopAgBdA2qFjOifhESRdi64niv71QpKCg2mWOSyYoslsReuCQAAAAAAAAAAAAAAAAAAAAACBSs1ZDAzNmE4NThjZTg5Zjg0NDQ5MTc2MmViODllMmJmYmQ1MGE0YTBhMGRhNjU4ZTRiMjYyOGIyNWIxMTdhZTA5KzA0MDFjOGFjOWYyOWRlZDllMWU0ZDViNmI0MzA1MWNiMjViMjJmMjdjN2I3YjM1MDkyMTYxZTg1MTk0NmY4MmZhilSXUhLq2T34yIFlXGJVRLzo7XzN/m8IpC7s+xrevQUTB75QFLsFFhe694FdUPYhKecJGBkDYeXU3UeWVBsK', 'base64');
			const transactionBytes = getTransactionBytes(createMultiSignatureTransaction);

			(transactionBytes).should.be.eql(expectedBuffer);
		});

		it('should create correct transactionBytes from multisignature send transaction', () => {
			const expectedBuffer = Buffer.from('AKopAgBdA2qFjOifhESRdi64niv71QpKCg2mWOSyYoslsReuCV0DaoWM6J+ERJF2LrieK/vVCkoKDaZY5LJiiyWxF64JAM68qo00FT3oAwAAAAAAAGGKVJdSEurZPfjIgWVcYlVEvOjtfM3+bwikLuz7Gt69BRMHvlAUuwUWF7r3gV1Q9iEp5wkYGQNh5dTdR5ZUGwo=', 'base64');
			const transactionBytes = getTransactionBytes(multiSignatureTransaction);

			(transactionBytes).should.be.eql(expectedBuffer);
		});
	});

	describe('dapp transaction, type 5', () => {
		const dappTransaction = {
			type: 5,
			amount: 0,
			fee: 2500000000,
			recipientId: null,
			senderPublicKey: defaultSenderPublicKey,
			timestamp: defaultTimestamp,
			asset: {
				dapp: {
					category: 0,
					name: 'Lisk Guestbook',
					description: 'The official Lisk guestbook',
					tags: 'guestbook message sidechain',
					type: 0,
					link: 'https://github.com/MaxKK/guestbookDapp/archive/master.zip',
					icon: 'https://raw.githubusercontent.com/MaxKK/guestbookDapp/master/icon.png',
				},
			},
			signature: defaultSignature,
			id: defaultTransactionId,
		};

		it('should create correct transactionBytes from dapp transaction', () => {
			const expectedBuffer = Buffer.from('BaopAgBdA2qFjOifhESRdi64niv71QpKCg2mWOSyYoslsReuCQAAAAAAAAAAAAAAAAAAAABMaXNrIEd1ZXN0Ym9va1RoZSBvZmZpY2lhbCBMaXNrIGd1ZXN0Ym9va2d1ZXN0Ym9vayBtZXNzYWdlIHNpZGVjaGFpbmh0dHBzOi8vZ2l0aHViLmNvbS9NYXhLSy9ndWVzdGJvb2tEYXBwL2FyY2hpdmUvbWFzdGVyLnppcGh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9NYXhLSy9ndWVzdGJvb2tEYXBwL21hc3Rlci9pY29uLnBuZwAAAAAAAAAAYYpUl1IS6tk9+MiBZVxiVUS86O18zf5vCKQu7Psa3r0FEwe+UBS7BRYXuveBXVD2ISnnCRgZA2Hl1N1HllQbCg==', 'base64');
			const transactionBytes = getTransactionBytes(dappTransaction);

			(transactionBytes).should.be.eql(expectedBuffer);
		});
	});

	describe('inTransfer transaction, type 6', () => {
		const inTransferTransction = {
			type: 6,
			amount: defaultAmount,
			fee: 10000000,
			recipientId: null,
			senderPublicKey: defaultSenderPublicKey,
			timestamp: defaultTimestamp,
			asset: { inTransfer: { dappId: defaultAppId } },
			signature: defaultSignature,
			id: defaultTransactionId,
		};
		it('should create correct transactionBytes from inTransfer transaction', () => {
			const expectedBuffer = Buffer.from('BqopAgBdA2qFjOifhESRdi64niv71QpKCg2mWOSyYoslsReuCQAAAAAAAAAA6AMAAAAAAAAxMjM0MjEzYYpUl1IS6tk9+MiBZVxiVUS86O18zf5vCKQu7Psa3r0FEwe+UBS7BRYXuveBXVD2ISnnCRgZA2Hl1N1HllQbCg==', 'base64');
			const transactionBytes = getTransactionBytes(inTransferTransction);

			(transactionBytes).should.be.eql(expectedBuffer);
		});
	});

	describe('outTransfer transaction, type 7', () => {
		const outTransferTransaction = {
			type: 7,
			amount: defaultAmount,
			fee: 10000000,
			recipientId: defaultRecipient,
			senderPublicKey: defaultSenderPublicKey,
			timestamp: defaultTimestamp,
			asset: { outTransfer: { dappId: defaultAppId, transactionId: defaultTransactionId } },
			signature: defaultSignature,
			id: defaultTransactionId,
		};
		it('should create correct transactionBytes from outTransfer transaction', () => {
			const expectedBuffer = Buffer.from('B6opAgBdA2qFjOifhESRdi64niv71QpKCg2mWOSyYoslsReuCQDOvKqNNBU96AMAAAAAAAAxMjM0MjEzMTM5ODczNDg0MjA5MTMxMzg0MjJhilSXUhLq2T34yIFlXGJVRLzo7XzN/m8IpC7s+xrevQUTB75QFLsFFhe694FdUPYhKecJGBkDYeXU3UeWVBsK', 'base64');
			const transactionBytes = getTransactionBytes(outTransferTransaction);

			(transactionBytes).should.be.eql(expectedBuffer);
		});
	});
});
