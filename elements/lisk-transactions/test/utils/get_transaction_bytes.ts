/*
 * Copyright © 2019 Lisk Foundation
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
import * as BigNum from '@liskhq/bignum';
import { expect } from 'chai';
import {
	getTransactionBytes,
	getAssetDataForTransferTransaction,
	getAssetDataForRegisterSecondSignatureTransaction,
	getAssetDataForRegisterDelegateTransaction,
	getAssetDataForCastVotesTransaction,
	getAssetDataForRegisterMultisignatureAccountTransaction,
	getAssetDataForCreateDappTransaction,
	getAssetDataForTransferIntoDappTransaction,
	getAssetDataForTransferOutOfDappTransaction,
	checkTransaction,
	checkRequiredFields,
	isValidValue,
} from '../../src/utils/get_transaction_bytes';
import { TransactionJSON } from '../../src/transaction_types';
import { MultiSignatureAsset } from '../../src/4_multisignature_transaction';

const fixedPoint = 10 ** 8;
const defaultRecipient = '58191285901858109L';
const defaultSenderPublicKey =
	'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
const defaultSenderId = '18160565574430594874L';
const defaultSenderSecondPublicKey =
	'0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f';
const defaultRecipientPublicKey =
	'0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82z';
// Use (1<<62) + 3 to ensure the highest and the lowest bytes are set and contain different data.
// This exceeds the safe integer range of JavaScript numbers and thus is expressed as a string.
const defaultAmount = '10000000000000000';
const defaultNoAmount = '0';
const defaultTimestamp = 141738;
const defaultTransactionId = '13987348420913138422';
const defaultSignature =
	'618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a';
const defaultSecondSignature =
	'b00c4ad1988bca245d74435660a278bfe6bf2f5efa8bda96d927fabf8b4f6fcfdcb2953f6abacaa119d6880987a55dea0e6354bc8366052b45fa23145522020f';
const defaultAppId = '1234213';
const defaultDelegateUsername = 'MyDelegateUsername';

describe('getTransactionBytes module', () => {
	describe('#getTransactionBytes', () => {
		describe('transfer transaction, type 0', () => {
			let defaultTransaction: TransactionJSON;

			beforeEach(() => {
				defaultTransaction = {
					type: 0,
					fee: (0.1 * fixedPoint).toString(),
					amount: defaultAmount,
					recipientId: defaultRecipient,
					recipientPublicKey: defaultRecipientPublicKey,
					timestamp: defaultTimestamp,
					asset: {},
					senderPublicKey: defaultSenderPublicKey,
					senderId: defaultSenderId,
					signature: defaultSignature,
					signatures: [],
					id: defaultTransactionId,
				};
				return Promise.resolve();
			});

			it('should return Buffer of type 0 (transfer LSK) transaction', () => {
				const expectedBuffer = Buffer.from(
					'00aa2902005d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae0900cebcaa8d34153d0000c16ff2862300618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
					'hex',
				);
				const transactionBytes = getTransactionBytes(defaultTransaction);

				return expect(transactionBytes).to.be.eql(expectedBuffer);
			});

			it('should return Buffer of type 0 (transfer LSK) with data', () => {
				const transferTransaction: TransactionJSON = {
					...defaultTransaction,
					asset: {
						data: 'Hello Lisk! Some data in here!...',
					},
				};
				const expectedBuffer = Buffer.from(
					'00aa2902005d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae0900cebcaa8d34153d0000c16ff286230048656c6c6f204c69736b2120536f6d65206461746120696e2068657265212e2e2e618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
					'hex',
				);
				const transactionBytes = getTransactionBytes(transferTransaction);

				return expect(transactionBytes).to.be.eql(expectedBuffer);
			});

			it('should throw on type 0 with too much data', () => {
				const maxDataLength = 64;
				const transferTransaction: TransactionJSON = {
					...defaultTransaction,
					asset: {
						data: new Array(maxDataLength + 1).fill('1').join(''),
					},
				};
				return expect(
					getTransactionBytes.bind(null, transferTransaction),
				).to.throw('Transaction asset data exceeds size of 64.');
			});

			it('should throw on type 0 with an amount that is too small', () => {
				const amount = -1;
				const transaction = {
					...defaultTransaction,
					amount,
				};
				return expect(
					getTransactionBytes.bind(
						null,
						(transaction as unknown) as TransactionJSON,
					),
				).to.throw('Transaction amount must not be negative.');
			});

			it('should throw on type 0 with an amount that is too large', () => {
				const amount = BigNum.fromBuffer(
					Buffer.from(new Array(8).fill(255)),
				).plus(1);
				const transaction = {
					...defaultTransaction,
					amount,
				};
				return expect(
					getTransactionBytes.bind(
						null,
						(transaction as unknown) as TransactionJSON,
					),
				).to.throw('Transaction amount is too large.');
			});

			it('should return Buffer of transaction with second signature', () => {
				const transaction = {
					...defaultTransaction,
					signSignature: defaultSecondSignature,
				};
				const expectedBuffer = Buffer.from(
					'00aa2902005d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae0900cebcaa8d34153d0000c16ff2862300618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0ab00c4ad1988bca245d74435660a278bfe6bf2f5efa8bda96d927fabf8b4f6fcfdcb2953f6abacaa119d6880987a55dea0e6354bc8366052b45fa23145522020f',
					'hex',
				);
				const transactionBytes = getTransactionBytes(transaction);
				return expect(transactionBytes).to.be.eql(expectedBuffer);
			});

			it('should return Buffer from multisignature type 0 (transfer LSK) transaction', () => {
				const multiSignatureTransaction = {
					...defaultTransaction,
					signatures: [],
				};
				const expectedBuffer = Buffer.from(
					'00aa2902005d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae0900cebcaa8d34153d0000c16ff2862300618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
					'hex',
				);
				const transactionBytes = getTransactionBytes(
					multiSignatureTransaction as any,
				);

				return expect(transactionBytes).to.be.eql(expectedBuffer);
			});

			it('should return Buffer of type 0 (transfer LSK) with additional properties', () => {
				const transaction = {
					...defaultTransaction,
					skip: false,
				};
				const expectedBuffer = Buffer.from(
					'00aa2902005d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae0900cebcaa8d34153d0000c16ff2862300618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
					'hex',
				);
				const transactionBytes = getTransactionBytes(transaction);

				return expect(transactionBytes).to.be.eql(expectedBuffer);
			});

			it('should throw on missing required parameter type', () => {
				const { type, ...defaultTransactionClone } = defaultTransaction;
				expect(
					getTransactionBytes.bind(
						null,
						(defaultTransactionClone as unknown) as TransactionJSON,
					),
				).to.throw(`type is a required parameter.`);
			});

			it('should throw on missing required parameter timestamp', () => {
				const { timestamp, ...defaultTransactionClone } = defaultTransaction;
				expect(
					getTransactionBytes.bind(
						null,
						(defaultTransactionClone as unknown) as TransactionJSON,
					),
				).to.throw(`timestamp is a required parameter.`);
			});

			it('should throw on missing required parameter senderPublicKey', () => {
				const {
					senderPublicKey,
					...defaultTransactionClone
				} = defaultTransaction;
				expect(
					getTransactionBytes.bind(
						null,
						(defaultTransactionClone as unknown) as TransactionJSON,
					),
				).to.throw(`senderPublicKey is a required parameter.`);
			});

			it('should throw on missing required parameter amount', () => {
				const { amount, ...defaultTransactionClone } = defaultTransaction;
				expect(
					getTransactionBytes.bind(
						null,
						(defaultTransactionClone as unknown) as TransactionJSON,
					),
				).to.throw(`amount is a required parameter.`);
			});
		});

		describe('signature transaction, type 1', () => {
			const signatureTransaction = {
				type: 1,
				amount: defaultNoAmount,
				fee: (5 * fixedPoint).toString(),
				recipientId: defaultRecipient,
				senderPublicKey: defaultSenderPublicKey,
				senderId: defaultSenderId,
				recipientPublicKey: defaultRecipientPublicKey,
				timestamp: defaultTimestamp,
				asset: { signature: { publicKey: defaultSenderSecondPublicKey } },
				signature: defaultSignature,
				signatures: [],
				id: defaultTransactionId,
			};

			it('should return Buffer of type 1 (register second signature) transaction', () => {
				const expectedBuffer = Buffer.from(
					'01aa2902005d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae0900cebcaa8d34153d00000000000000000401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
					'hex',
				);
				const transactionBytes = getTransactionBytes(signatureTransaction);

				return expect(transactionBytes).to.be.eql(expectedBuffer);
			});
		});

		describe('delegate registration transaction, type 2', () => {
			const delegateRegistrationTransaction = {
				type: 2,
				amount: defaultNoAmount,
				fee: (25 * fixedPoint).toString(),
				recipientId: defaultRecipient,
				senderPublicKey: defaultSenderPublicKey,
				senderId: defaultSenderId,
				recipientPublicKey: defaultRecipientPublicKey,
				timestamp: defaultTimestamp,
				asset: { delegate: { username: defaultDelegateUsername } },
				signature: defaultSignature,
				signatures: [],
				id: defaultTransactionId,
			};

			it('should return Buffer of type 2 (register delegate) transaction', () => {
				const expectedBuffer = Buffer.from(
					'02aa2902005d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae0900cebcaa8d34153d00000000000000004d7944656c6567617465557365726e616d65618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
					'hex',
				);
				const transactionBytes = getTransactionBytes(
					delegateRegistrationTransaction,
				);

				return expect(transactionBytes).to.be.eql(expectedBuffer);
			});
		});

		describe('vote transaction, type 3', () => {
			const voteTransaction = {
				type: 3,
				amount: '0',
				fee: (1 * fixedPoint).toString(),
				recipientId: defaultRecipient,
				senderPublicKey: defaultSenderPublicKey,
				senderId: defaultSenderId,
				recipientPublicKey: defaultRecipientPublicKey,
				timestamp: defaultTimestamp,
				asset: {
					votes: [
						`+${defaultSenderPublicKey}`,
						`+${defaultSenderSecondPublicKey}`,
					],
				},
				signature: defaultSignature,
				signatures: [],
				id: defaultTransactionId,
			};

			it('should return Buffer of type 3 (vote) transaction', () => {
				const expectedBuffer = Buffer.from(
					'03aa2902005d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae0900cebcaa8d34153d00000000000000002b356430333661383538636538396638343434393137363265623839653262666264353061346130613064613635386534623236323862323562313137616530392b30343031633861633966323964656439653165346435623662343330353163623235623232663237633762376233353039323136316538353139343666383266618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
					'hex',
				);
				const transactionBytes = getTransactionBytes(voteTransaction);

				return expect(transactionBytes).to.be.eql(expectedBuffer);
			});
		});

		describe('multisignature transaction, type 4', () => {
			const createMultiSignatureTransaction = {
				type: 4,
				amount: '0',
				fee: (15 * fixedPoint).toString(),
				recipientId: defaultRecipient,
				senderPublicKey: defaultSenderPublicKey,
				senderId: defaultSenderId,
				recipientPublicKey: defaultRecipientPublicKey,
				timestamp: defaultTimestamp,
				asset: {
					multisignature: {
						min: 2,
						lifetime: 5,
						keysgroup: [
							`+${defaultSenderPublicKey}`,
							`+${defaultSenderSecondPublicKey}`,
						],
					},
				},
				signature: defaultSignature,
				signatures: [],
				id: defaultTransactionId,
			};

			it('should return Buffer from type 4 (register multisignature) transaction', () => {
				const expectedBuffer = Buffer.from(
					'04aa2902005d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae0900cebcaa8d34153d000000000000000002052b356430333661383538636538396638343434393137363265623839653262666264353061346130613064613635386534623236323862323562313137616530392b30343031633861633966323964656439653165346435623662343330353163623235623232663237633762376233353039323136316538353139343666383266618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
					'hex',
				);
				const transactionBytes = getTransactionBytes(
					createMultiSignatureTransaction,
				);

				return expect(transactionBytes).to.be.eql(expectedBuffer);
			});
		});

		describe('dapp transaction, type 5', () => {
			const dappTransaction = {
				type: 5,
				amount: '0',
				fee: (25 * fixedPoint).toString(),
				recipientId: defaultRecipient,
				senderPublicKey: defaultSenderPublicKey,
				senderId: defaultSenderId,
				recipientPublicKey: defaultRecipientPublicKey,
				timestamp: defaultTimestamp,
				asset: {
					dapp: {
						category: 0,
						name: 'Lisk Guestbook',
						description: 'The official Lisk guestbook',
						tags: 'guestbook message sidechain',
						type: 0,
						link: 'https://github.com/MaxKK/guestbookDapp/archive/master.zip',
						icon:
							'https://raw.githubusercontent.com/MaxKK/guestbookDapp/master/icon.png',
					},
				},
				signature: defaultSignature,
				signatures: [],
				id: defaultTransactionId,
			};

			it('should return Buffer of type 5 (register dapp) transaction', () => {
				const expectedBuffer = Buffer.from(
					'05aa2902005d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae0900cebcaa8d34153d00000000000000004c69736b204775657374626f6f6b546865206f6666696369616c204c69736b206775657374626f6f6b6775657374626f6f6b206d6573736167652073696465636861696e68747470733a2f2f6769746875622e636f6d2f4d61784b4b2f6775657374626f6f6b446170702f617263686976652f6d61737465722e7a697068747470733a2f2f7261772e67697468756275736572636f6e74656e742e636f6d2f4d61784b4b2f6775657374626f6f6b446170702f6d61737465722f69636f6e2e706e670000000000000000618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
					'hex',
				);
				const transactionBytes = getTransactionBytes(dappTransaction);

				return expect(transactionBytes).to.be.eql(expectedBuffer);
			});
		});

		describe('inTransfer transaction, type 6', () => {
			const inTransferTransction = {
				type: 6,
				amount: defaultAmount,
				fee: (1 * fixedPoint).toString(),
				recipientId: defaultRecipient,
				senderPublicKey: defaultSenderPublicKey,
				senderId: defaultSenderId,
				recipientPublicKey: defaultRecipientPublicKey,
				timestamp: defaultTimestamp,
				asset: { inTransfer: { dappId: defaultAppId } },
				signature: defaultSignature,
				signatures: [],
				id: defaultTransactionId,
			};

			it('should return Buffer of type 6 (dapp inTransfer) transaction', () => {
				const expectedBuffer = Buffer.from(
					'06aa2902005d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae0900cebcaa8d34153d0000c16ff286230031323334323133618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
					'hex',
				);
				const transactionBytes = getTransactionBytes(inTransferTransction);

				return expect(transactionBytes).to.be.eql(expectedBuffer);
			});
		});

		describe('outTransfer transaction, type 7', () => {
			const outTransferTransaction = {
				type: 7,
				amount: defaultAmount,
				fee: (1 * fixedPoint).toString(),
				recipientId: defaultRecipient,
				senderPublicKey: defaultSenderPublicKey,
				senderId: defaultSenderId,
				recipientPublicKey: defaultRecipientPublicKey,
				timestamp: defaultTimestamp,
				asset: {
					outTransfer: {
						dappId: defaultAppId,
						transactionId: defaultTransactionId,
					},
				},
				signature: defaultSignature,
				signatures: [],
				id: defaultTransactionId,
			};

			it('should return Buffer of type 7 (dapp outTransfer) transaction', () => {
				const expectedBuffer = Buffer.from(
					'07aa2902005d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae0900cebcaa8d34153d0000c16ff2862300313233343231333133393837333438343230393133313338343232618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
					'hex',
				);
				const transactionBytes = getTransactionBytes(outTransferTransaction);

				return expect(transactionBytes).to.be.eql(expectedBuffer);
			});
		});
	});

	describe('getTransactionBytes functions', () => {
		describe('#checkRequiredFields', () => {
			const arrayToCheck = ['OneValue', 'SecondValue', 'ThirdValue'];
			it('should accept array and object to check for required fields', () => {
				const objectParameter = {
					OneValue: '1',
					SecondValue: '2',
					ThirdValue: '3',
				};

				return expect(checkRequiredFields(arrayToCheck, objectParameter)).to.be
					.true;
			});

			it('should throw on missing value', () => {
				const objectParameter = {
					OneValue: '1',
					SecondValue: '2',
				};

				return expect(
					checkRequiredFields.bind(null, arrayToCheck, objectParameter),
				).to.throw('ThirdValue is a required parameter.');
			});
		});

		describe('#getAssetDataForTransferTransaction', () => {
			const defaultEmptyBuffer = Buffer.alloc(0);
			it('should return Buffer for data asset', () => {
				const expectedBuffer = Buffer.from('my data input', 'utf8');
				const assetDataBuffer = getAssetDataForTransferTransaction({
					data: 'my data input',
				});

				return expect(assetDataBuffer).to.be.eql(expectedBuffer);
			});

			it('should return empty Buffer for no asset data', () => {
				const assetDataBuffer = getAssetDataForTransferTransaction({} as any);
				return expect(assetDataBuffer).to.be.eql(defaultEmptyBuffer);
			});
		});

		describe('#getAssetDataForRegisterSecondSignatureTransaction', () => {
			it('should return Buffer for signature asset', () => {
				const expectedBuffer = Buffer.from(defaultSenderPublicKey, 'hex');
				const assetSignaturesPublicKeyBuffer = getAssetDataForRegisterSecondSignatureTransaction(
					{
						signature: {
							publicKey: defaultSenderPublicKey,
						},
					},
				);

				return expect(assetSignaturesPublicKeyBuffer).to.be.eql(expectedBuffer);
			});

			it('should throw on missing publicKey in the signature asset', () => {
				return expect(
					getAssetDataForRegisterSecondSignatureTransaction.bind(null, {
						signature: {} as any,
					}),
				).to.throw('publicKey is a required parameter.');
			});
		});

		describe('#getAssetDataForRegisterDelegateTransaction', () => {
			it('should return Buffer for delegate asset', () => {
				const expectedBuffer = Buffer.from(defaultDelegateUsername, 'utf8');
				const assetDelegateUsernameBuffer = getAssetDataForRegisterDelegateTransaction(
					{
						delegate: {
							username: defaultDelegateUsername,
						},
					},
				);

				return expect(assetDelegateUsernameBuffer).to.be.eql(expectedBuffer);
			});

			it('should throw on missing username in the delegate asset', () => {
				return expect(
					getAssetDataForRegisterDelegateTransaction.bind(null, {
						delegate: {} as any,
					}),
				).to.throw('username is a required parameter.');
			});
		});

		describe('#getAssetDataForCastVotesTransaction', () => {
			it('should return Buffer for votes asset', () => {
				const votesAsset = {
					votes: [
						`+${defaultSenderPublicKey}`,
						`+${defaultSenderSecondPublicKey}`,
					],
				};
				const expectedBuffer = Buffer.from(
					`+${defaultSenderPublicKey}+${defaultSenderSecondPublicKey}`,
					'utf8',
				);
				const assetVoteBuffer = getAssetDataForCastVotesTransaction(votesAsset);

				return expect(assetVoteBuffer).to.be.eql(expectedBuffer);
			});

			it('should throw on missing votes in the vote asset', () => {
				return expect(
					getAssetDataForCastVotesTransaction.bind(null, { votes: {} as any }),
				).to.throw('votes parameter must be an Array.');
			});
		});

		describe('#getAssetDataForRegisterMultisignatureAccountTransaction', () => {
			const min = 2;
			const lifetime = 5;
			const keysgroup = ['+123456789', '-987654321'];
			let multisignatureAsset: MultiSignatureAsset;

			beforeEach(() => {
				multisignatureAsset = {
					multisignature: {
						min,
						lifetime,
						keysgroup,
					},
				};
				return Promise.resolve();
			});

			it('should return Buffer for multisignature asset', () => {
				const minBuffer = Buffer.alloc(1, min);
				const lifetimeBuffer = Buffer.alloc(1, lifetime);
				const keysgroupBuffer = Buffer.from('+123456789-987654321', 'utf8');

				const expectedBuffer = Buffer.concat([
					minBuffer,
					lifetimeBuffer,
					keysgroupBuffer,
				]);
				const multisignatureBuffer = getAssetDataForRegisterMultisignatureAccountTransaction(
					multisignatureAsset,
				);

				return expect(multisignatureBuffer).to.be.eql(expectedBuffer);
			});

			it('should throw on missing required parameter min', () => {
				const { min, ...multisigAsset } = multisignatureAsset.multisignature;
				expect(
					getAssetDataForRegisterMultisignatureAccountTransaction.bind(null, {
						multisignature: multisigAsset as any,
					}),
				).to.throw(`min is a required parameter.`);
			});

			it('should throw on missing required parameter lifetime', () => {
				const {
					lifetime,
					...multisigAsset
				} = multisignatureAsset.multisignature;
				expect(
					getAssetDataForRegisterMultisignatureAccountTransaction.bind(null, {
						multisignature: multisigAsset as any,
					}),
				).to.throw(`lifetime is a required parameter.`);
			});

			it('should throw on missing required parameter keysgroup', () => {
				const {
					keysgroup,
					...multisigAsset
				} = multisignatureAsset.multisignature;
				expect(
					getAssetDataForRegisterMultisignatureAccountTransaction.bind(null, {
						multisignature: multisigAsset as any,
					}),
				).to.throw(`keysgroup is a required parameter.`);
			});
		});

		describe('#getAssetDataForCreateDappTransaction', () => {
			const defaultCategory = 0;
			const defaultDappName = 'Lisk Guestbook';
			const defaultDescription = 'The official Lisk guestbook';
			const defaultTags = 'guestbook message sidechain';
			const defaultType = 0;
			const defaultLink =
				'https://github.com/MaxKK/guestbookDapp/archive/master.zip';
			const defaultIcon =
				'https://raw.githubusercontent.com/MaxKK/guestbookDapp/master/icon.png';
			const dappNameBuffer = Buffer.from('4c69736b204775657374626f6f6b', 'hex');
			const dappDescriptionBuffer = Buffer.from(
				'546865206f6666696369616c204c69736b206775657374626f6f6b',
				'hex',
			);
			const dappTagsBuffer = Buffer.from(
				'6775657374626f6f6b206d6573736167652073696465636861696e',
				'hex',
			);
			const dappLinkBuffer = Buffer.from(
				'68747470733a2f2f6769746875622e636f6d2f4d61784b4b2f6775657374626f6f6b446170702f617263686976652f6d61737465722e7a6970',
				'hex',
			);
			const dappIconBuffer = Buffer.from(
				'68747470733a2f2f7261772e67697468756275736572636f6e74656e742e636f6d2f4d61784b4b2f6775657374626f6f6b446170702f6d61737465722f69636f6e2e706e67',
				'hex',
			);
			const dappTypeBuffer = Buffer.alloc(4, defaultType);
			const dappCategoryBuffer = Buffer.alloc(4, defaultCategory);

			it('should return Buffer for create dapp asset', () => {
				const dappAsset = {
					dapp: {
						category: defaultCategory,
						name: defaultDappName,
						description: defaultDescription,
						tags: defaultTags,
						type: defaultType,
						link: defaultLink,
						icon: defaultIcon,
					},
				};

				const expectedBuffer = Buffer.concat([
					dappNameBuffer,
					dappDescriptionBuffer,
					dappTagsBuffer,
					dappLinkBuffer,
					dappIconBuffer,
					dappTypeBuffer,
					dappCategoryBuffer,
				]);
				const dappBuffer = getAssetDataForCreateDappTransaction(dappAsset);

				return expect(dappBuffer).to.be.eql(expectedBuffer);
			});

			it('should throw for create dapp asset without required fields', () => {
				const dapp: { readonly [key: string]: string | number } = {
					category: defaultCategory,
					name: defaultDappName,
					description: defaultDescription,
					tags: defaultTags,
					type: defaultType,
					link: defaultLink,
					icon: defaultIcon,
				};
				const requiredProperties = ['name', 'link', 'type', 'category'];

				return requiredProperties.forEach(parameter => {
					const { [parameter]: deletedValue, ...dappClone } = dapp;
					expect(
						getAssetDataForCreateDappTransaction.bind(null, {
							dapp: dappClone as any,
						}),
					).to.throw(`${parameter} is a required parameter.`);
				});
			});
		});

		describe('#getAssetDataForTransferIntoDappTransaction', () => {
			it('should return Buffer for dappIn asset', () => {
				const dappInAsset = {
					inTransfer: {
						dappId: defaultAppId,
					},
				};
				const expectedBuffer = Buffer.from(defaultAppId, 'utf8');
				const dappInTransferBuffer = getAssetDataForTransferIntoDappTransaction(
					dappInAsset,
				);

				return expect(dappInTransferBuffer).to.be.eql(expectedBuffer);
			});

			it('should throw on missing votes in the vote asset', () => {
				return expect(
					getAssetDataForTransferIntoDappTransaction.bind(null, {
						inTransfer: {} as any,
					}),
				).to.throw('dappId is a required parameter.');
			});
		});

		describe('#getAssetDataForTransferOutOfDappTransaction', () => {
			it('should return Buffer for dappOut asset', () => {
				const dappOutAsset = {
					outTransfer: {
						dappId: defaultAppId,
						transactionId: defaultTransactionId,
					},
				};
				const dappIdBuffer = Buffer.from(defaultAppId, 'utf8');
				const transactionIdBuffer = Buffer.from(defaultTransactionId);
				const expectedBuffer = Buffer.concat([
					dappIdBuffer,
					transactionIdBuffer,
				]);
				const dappOutTransferBuffer = getAssetDataForTransferOutOfDappTransaction(
					dappOutAsset,
				);

				return expect(dappOutTransferBuffer).to.be.eql(expectedBuffer);
			});

			it('should throw on missing votes in the vote asset', () => {
				return expect(
					getAssetDataForTransferOutOfDappTransaction.bind(null, {
						outTransfer: {} as any,
					}),
				).to.throw('dappId is a required parameter.');
			});
		});

		describe('#checkTransaction', () => {
			const maxDataLength = 64;
			let defaultTransaction: TransactionJSON;
			beforeEach(() => {
				defaultTransaction = {
					type: 0,
					fee: (0.1 * fixedPoint).toString(),
					amount: defaultAmount,
					recipientId: defaultRecipient,
					timestamp: defaultTimestamp,
					asset: {},
					senderPublicKey: defaultSenderPublicKey,
					recipientPublicKey: defaultRecipientPublicKey,
					senderId: defaultSenderId,
					signature: defaultSignature,
					signatures: [],
					id: defaultTransactionId,
				};
				return Promise.resolve();
			});

			it('should throw on too many data in transfer asset', () => {
				const transaction = {
					...defaultTransaction,
					asset: {
						data: new Array(maxDataLength + 1).fill('1').join(''),
					},
				};
				return expect(checkTransaction.bind(null, transaction)).to.throw(
					'Transaction asset data exceeds size of 64.',
				);
			});

			it('should return true on asset data exactly at max data length', () => {
				const transaction = {
					...defaultTransaction,
					asset: {
						data: new Array(maxDataLength).fill('1').join(''),
					},
				};
				return expect(checkTransaction(transaction)).to.be.true;
			});
		});

		describe('#isInvalidValue', () => {
			it('should return false on invalid values', () => {
				const allInvalidValues = [NaN, false, undefined];
				return allInvalidValues.forEach(value => {
					const invalid = isValidValue(value);
					expect(invalid).to.be.false;
				});
			});
			it('should return true on valid values', () => {
				const exampleValidValues = ['123', 123, { 1: 2, 3: 4 }, [1, 2, 3]];
				return exampleValidValues.forEach(value => {
					const valid = isValidValue(value);
					expect(valid).to.be.true;
				});
			});
		});
	});
});
