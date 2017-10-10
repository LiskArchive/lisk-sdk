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
import getTransactionBytes, {
	getAssetDataForSendTransaction,
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
} from '../../../src/transactions/utils/getTransactionBytes';

const fixedPoint = 10 ** 8;
const defaultRecipient = '58191285901858109L';
const defaultSenderPublicKey = '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
const defaultSenderId = '18160565574430594874L';
const defaultSenderSecondPublicKey = '0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f';
const defaultAmount = 1000;
const defaultNoAmount = 0;
const defaultTimestamp = 141738;
const defaultTransactionId = '13987348420913138422';
const defaultSignature = '618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a';
const defaultSecondSignature = 'b00c4ad1988bca245d74435660a278bfe6bf2f5efa8bda96d927fabf8b4f6fcfdcb2953f6abacaa119d6880987a55dea0e6354bc8366052b45fa23145522020f';
const defaultAppId = '1234213';
const defaultDelegateUsername = 'MyDelegateUsername';

describe('#getTransactionBytes', () => {
	describe('send transaction, type 0', () => {
		let defaultTransaction;

		beforeEach(() => {
			defaultTransaction = {
				type: 0,
				fee: 0.1 * fixedPoint,
				amount: defaultAmount,
				recipientId: defaultRecipient,
				timestamp: defaultTimestamp,
				asset: {},
				senderPublicKey: defaultSenderPublicKey,
				senderId: defaultSenderId,
				signature: defaultSignature,
				id: defaultTransactionId,
			};
		});

		it('should return Buffer of type 0 (send LSK) transaction', () => {
			const expectedBuffer = Buffer.from('AKopAgBdA2qFjOifhESRdi64niv71QpKCg2mWOSyYoslsReuCQDOvKqNNBU96AMAAAAAAABhilSXUhLq2T34yIFlXGJVRLzo7XzN/m8IpC7s+xrevQUTB75QFLsFFhe694FdUPYhKecJGBkDYeXU3UeWVBsK', 'base64');
			const transactionBytes = getTransactionBytes(defaultTransaction);

			(transactionBytes).should.be.eql(expectedBuffer);
		});

		it('should return Buffer of type 0 (send LSK) with data', () => {
			defaultTransaction.asset.data = 'Hello Lisk! Some data in here!...';
			const expectedBuffer = Buffer.from('AKopAgBdA2qFjOifhESRdi64niv71QpKCg2mWOSyYoslsReuCQDOvKqNNBU96AMAAAAAAABIZWxsbyBMaXNrISBTb21lIGRhdGEgaW4gaGVyZSEuLi5hilSXUhLq2T34yIFlXGJVRLzo7XzN/m8IpC7s+xrevQUTB75QFLsFFhe694FdUPYhKecJGBkDYeXU3UeWVBsK', 'base64');
			const transactionBytes = getTransactionBytes(defaultTransaction);

			(transactionBytes).should.be.eql(expectedBuffer);
		});

		it('should throw on type 0 with too much data', () => {
			const maxDataLength = 64;
			defaultTransaction.asset.data = new Array(maxDataLength + 1).fill('1').join('');
			(getTransactionBytes.bind(null, defaultTransaction)).should.throw('Transaction asset data exceeds size of 64.');
		});

		it('should return Buffer of transaction with second signature', () => {
			defaultTransaction.signSignature = defaultSecondSignature;
			const expectedBuffer = Buffer.from('AKopAgBdA2qFjOifhESRdi64niv71QpKCg2mWOSyYoslsReuCQDOvKqNNBU96AMAAAAAAABhilSXUhLq2T34yIFlXGJVRLzo7XzN/m8IpC7s+xrevQUTB75QFLsFFhe694FdUPYhKecJGBkDYeXU3UeWVBsKsAxK0ZiLyiRddENWYKJ4v+a/L176i9qW2Sf6v4tPb8/cspU/arrKoRnWiAmHpV3qDmNUvINmBStF+iMUVSICDw==', 'base64');
			const transactionBytes = getTransactionBytes(defaultTransaction);

			(transactionBytes).should.be.eql(expectedBuffer);
		});

		it('should return Buffer from multisignature type 0 (send LSK) transaction', () => {
			const multiSignatureTransaction = {
				type: 0,
				amount: 1000,
				fee: 1 * fixedPoint,
				recipientId: defaultRecipient,
				senderPublicKey: defaultSenderPublicKey,
				requesterPublicKey: '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
				timestamp: defaultTimestamp,
				asset: {},
				signatures: [],
				signature: defaultSignature,
				id: defaultTransactionId,
			};
			const expectedBuffer = Buffer.from('AKopAgBdA2qFjOifhESRdi64niv71QpKCg2mWOSyYoslsReuCV0DaoWM6J+ERJF2LrieK/vVCkoKDaZY5LJiiyWxF64JAM68qo00FT3oAwAAAAAAAGGKVJdSEurZPfjIgWVcYlVEvOjtfM3+bwikLuz7Gt69BRMHvlAUuwUWF7r3gV1Q9iEp5wkYGQNh5dTdR5ZUGwo=', 'base64');
			const transactionBytes = getTransactionBytes(multiSignatureTransaction);

			(transactionBytes).should.be.eql(expectedBuffer);
		});

		it('should return Buffer of type 0 (send LSK) with additional properties', () => {
			defaultTransaction.skip = false;
			const expectedBuffer = Buffer.from('AKopAgBdA2qFjOifhESRdi64niv71QpKCg2mWOSyYoslsReuCQDOvKqNNBU96AMAAAAAAABhilSXUhLq2T34yIFlXGJVRLzo7XzN/m8IpC7s+xrevQUTB75QFLsFFhe694FdUPYhKecJGBkDYeXU3UeWVBsK', 'base64');
			const transactionBytes = getTransactionBytes(defaultTransaction);

			(transactionBytes).should.be.eql(expectedBuffer);
		});

		it('should throw on missing required parameters', () => {
			const requiredProperties = ['type', 'timestamp', 'senderPublicKey', 'amount'];

			requiredProperties.forEach((parameter) => {
				const defaultTransactionClone = Object.assign({}, defaultTransaction);
				delete defaultTransactionClone[parameter];
				(getTransactionBytes.bind(null, defaultTransactionClone)).should.throw(`${parameter} is a required parameter.`);
			});
		});

		it('should throw on required parameters as undefined', () => {
			const requiredProperties = ['type', 'timestamp', 'senderPublicKey', 'amount'];

			requiredProperties.forEach((parameter) => {
				const defaultTransactionClone = Object.assign({}, defaultTransaction);
				defaultTransactionClone[parameter] = undefined;
				(getTransactionBytes.bind(null, defaultTransactionClone)).should.throw(`${parameter} is a required parameter.`);
			});
		});
	});

	describe('signature transaction, type 1', () => {
		const signatureTransaction = {
			type: 1,
			amount: defaultNoAmount,
			fee: 5 * fixedPoint,
			recipientId: null,
			senderPublicKey: defaultSenderPublicKey,
			timestamp: defaultTimestamp,
			asset: { signature: { publicKey: defaultSenderSecondPublicKey } },
			signature: defaultSignature,
			id: defaultTransactionId,
		};

		it('should return Buffer of type 1 (register second signature) transaction', () => {
			const expectedBuffer = Buffer.from('AaopAgBdA2qFjOifhESRdi64niv71QpKCg2mWOSyYoslsReuCQAAAAAAAAAAAAAAAAAAAAAEAcisnyne2eHk1ba0MFHLJbIvJ8e3s1CSFh6FGUb4L2GKVJdSEurZPfjIgWVcYlVEvOjtfM3+bwikLuz7Gt69BRMHvlAUuwUWF7r3gV1Q9iEp5wkYGQNh5dTdR5ZUGwo=', 'base64');
			const transactionBytes = getTransactionBytes(signatureTransaction);

			(transactionBytes).should.be.eql(expectedBuffer);
		});
	});

	describe('delegate registration transaction, type 2', () => {
		const delegateRegistrationTransaction = {
			type: 2,
			amount: defaultNoAmount,
			fee: 25 * fixedPoint,
			recipientId: null,
			senderPublicKey: defaultSenderPublicKey,
			timestamp: defaultTimestamp,
			asset: { delegate: { username: defaultDelegateUsername } },
			signature: defaultSignature,
			id: defaultTransactionId,
		};

		it('should return Buffer of type 2 (register delegate) transaction', () => {
			const expectedBuffer = Buffer.from('AqopAgBdA2qFjOifhESRdi64niv71QpKCg2mWOSyYoslsReuCQAAAAAAAAAAAAAAAAAAAABNeURlbGVnYXRlVXNlcm5hbWVhilSXUhLq2T34yIFlXGJVRLzo7XzN/m8IpC7s+xrevQUTB75QFLsFFhe694FdUPYhKecJGBkDYeXU3UeWVBsK', 'base64');
			const transactionBytes = getTransactionBytes(delegateRegistrationTransaction);

			(transactionBytes).should.be.eql(expectedBuffer);
		});
	});

	describe('vote transaction, type 3', () => {
		const voteTransaction = {
			type: 3,
			amount: 0,
			fee: 1 * fixedPoint,
			recipientId: defaultRecipient,
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

		it('should return Buffer of type 3 (vote) transaction', () => {
			const expectedBuffer = Buffer.from('A6opAgBdA2qFjOifhESRdi64niv71QpKCg2mWOSyYoslsReuCQDOvKqNNBU9AAAAAAAAAAArNWQwMzZhODU4Y2U4OWY4NDQ0OTE3NjJlYjg5ZTJiZmJkNTBhNGEwYTBkYTY1OGU0YjI2MjhiMjViMTE3YWUwOSswNDAxYzhhYzlmMjlkZWQ5ZTFlNGQ1YjZiNDMwNTFjYjI1YjIyZjI3YzdiN2IzNTA5MjE2MWU4NTE5NDZmODJmYYpUl1IS6tk9+MiBZVxiVUS86O18zf5vCKQu7Psa3r0FEwe+UBS7BRYXuveBXVD2ISnnCRgZA2Hl1N1HllQbCg==', 'base64');
			const transactionBytes = getTransactionBytes(voteTransaction);

			(transactionBytes).should.be.eql(expectedBuffer);
		});
	});

	describe('multisignature transaction, type 4', () => {
		const createMultiSignatureTransaction = {
			type: 4,
			amount: 0,
			fee: 15 * fixedPoint,
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

		it('should return Buffer from type 4 (register multisignature) transaction', () => {
			const expectedBuffer = Buffer.from('BKopAgBdA2qFjOifhESRdi64niv71QpKCg2mWOSyYoslsReuCQAAAAAAAAAAAAAAAAAAAAACBSs1ZDAzNmE4NThjZTg5Zjg0NDQ5MTc2MmViODllMmJmYmQ1MGE0YTBhMGRhNjU4ZTRiMjYyOGIyNWIxMTdhZTA5KzA0MDFjOGFjOWYyOWRlZDllMWU0ZDViNmI0MzA1MWNiMjViMjJmMjdjN2I3YjM1MDkyMTYxZTg1MTk0NmY4MmZhilSXUhLq2T34yIFlXGJVRLzo7XzN/m8IpC7s+xrevQUTB75QFLsFFhe694FdUPYhKecJGBkDYeXU3UeWVBsK', 'base64');
			const transactionBytes = getTransactionBytes(createMultiSignatureTransaction);

			(transactionBytes).should.be.eql(expectedBuffer);
		});
	});

	describe('dapp transaction, type 5', () => {
		const dappTransaction = {
			type: 5,
			amount: 0,
			fee: 25 * fixedPoint,
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

		it('should return Buffer of type 5 (register dapp) transaction', () => {
			const expectedBuffer = Buffer.from('BaopAgBdA2qFjOifhESRdi64niv71QpKCg2mWOSyYoslsReuCQAAAAAAAAAAAAAAAAAAAABMaXNrIEd1ZXN0Ym9va1RoZSBvZmZpY2lhbCBMaXNrIGd1ZXN0Ym9va2d1ZXN0Ym9vayBtZXNzYWdlIHNpZGVjaGFpbmh0dHBzOi8vZ2l0aHViLmNvbS9NYXhLSy9ndWVzdGJvb2tEYXBwL2FyY2hpdmUvbWFzdGVyLnppcGh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9NYXhLSy9ndWVzdGJvb2tEYXBwL21hc3Rlci9pY29uLnBuZwAAAAAAAAAAYYpUl1IS6tk9+MiBZVxiVUS86O18zf5vCKQu7Psa3r0FEwe+UBS7BRYXuveBXVD2ISnnCRgZA2Hl1N1HllQbCg==', 'base64');
			const transactionBytes = getTransactionBytes(dappTransaction);

			(transactionBytes).should.be.eql(expectedBuffer);
		});
	});

	describe('inTransfer transaction, type 6', () => {
		const inTransferTransction = {
			type: 6,
			amount: defaultAmount,
			fee: 1 * fixedPoint,
			recipientId: null,
			senderPublicKey: defaultSenderPublicKey,
			timestamp: defaultTimestamp,
			asset: { inTransfer: { dappId: defaultAppId } },
			signature: defaultSignature,
			id: defaultTransactionId,
		};
		it('should return Buffer of type 6 (dapp inTransfer) transaction', () => {
			const expectedBuffer = Buffer.from('BqopAgBdA2qFjOifhESRdi64niv71QpKCg2mWOSyYoslsReuCQAAAAAAAAAA6AMAAAAAAAAxMjM0MjEzYYpUl1IS6tk9+MiBZVxiVUS86O18zf5vCKQu7Psa3r0FEwe+UBS7BRYXuveBXVD2ISnnCRgZA2Hl1N1HllQbCg==', 'base64');
			const transactionBytes = getTransactionBytes(inTransferTransction);

			(transactionBytes).should.be.eql(expectedBuffer);
		});
	});

	describe('outTransfer transaction, type 7', () => {
		const outTransferTransaction = {
			type: 7,
			amount: defaultAmount,
			fee: 1 * fixedPoint,
			recipientId: defaultRecipient,
			senderPublicKey: defaultSenderPublicKey,
			timestamp: defaultTimestamp,
			asset: { outTransfer: { dappId: defaultAppId, transactionId: defaultTransactionId } },
			signature: defaultSignature,
			id: defaultTransactionId,
		};
		it('should return Buffer of type 7 (dapp outTransfer) transaction', () => {
			const expectedBuffer = Buffer.from('B6opAgBdA2qFjOifhESRdi64niv71QpKCg2mWOSyYoslsReuCQDOvKqNNBU96AMAAAAAAAAxMjM0MjEzMTM5ODczNDg0MjA5MTMxMzg0MjJhilSXUhLq2T34yIFlXGJVRLzo7XzN/m8IpC7s+xrevQUTB75QFLsFFhe694FdUPYhKecJGBkDYeXU3UeWVBsK', 'base64');
			const transactionBytes = getTransactionBytes(outTransferTransaction);

			(transactionBytes).should.be.eql(expectedBuffer);
		});
	});
});

describe('getTransactionBytes functions', () => {
	describe('#checkRequiredFields', () => {
		const arrayToCheck = ['OneValue', 'SecondValue', 'ThirdValue', 1];
		it('should accept array and object to check for required fields', () => {
			const objectParameter = {
				OneValue: '1',
				SecondValue: '2',
				ThirdValue: '3',
				1: 10,
			};

			(checkRequiredFields(arrayToCheck, objectParameter)).should.be.true();
		});

		it('should throw on missing value', () => {
			const objectParameter = {
				OneValue: '1',
				SecondValue: '2',
				1: 10,
			};

			(checkRequiredFields.bind(null, arrayToCheck, objectParameter)).should.throw('ThirdValue is a required parameter.');
		});
	});

	describe('#getAssetDataForSendTransaction', () => {
		const defaultEmptyBuffer = Buffer.alloc(0);
		it('should return Buffer for data asset', () => {
			const expectedBuffer = Buffer.from('my data input', 'utf8');
			const assetDataBuffer = getAssetDataForSendTransaction({
				data: 'my data input',
			});

			(assetDataBuffer).should.be.eql(expectedBuffer);
		});

		it('should return empty Buffer for no asset data', () => {
			const assetDataBuffer = getAssetDataForSendTransaction({});
			(assetDataBuffer).should.be.eql(defaultEmptyBuffer);
		});
	});

	describe('#getAssetDataForRegisterSecondSignatureTransaction', () => {
		it('should return Buffer for signature asset', () => {
			const expectedBuffer = Buffer.from(defaultSenderPublicKey, 'hex');
			const assetSignaturesPublicKeyBuffer = getAssetDataForRegisterSecondSignatureTransaction({
				signature: {
					publicKey: defaultSenderPublicKey,
				},
			});

			(assetSignaturesPublicKeyBuffer).should.be.eql(expectedBuffer);
		});

		it('should throw on missing publicKey in the signature asset', () => {
			(getAssetDataForRegisterSecondSignatureTransaction.bind(
				null,
				{ signature: {} },
			)).should.throw(
				'publicKey is a required parameter.',
			);
		});
	});

	describe('#getAssetDataForRegisterDelegateTransaction', () => {
		it('should return Buffer for delegate asset', () => {
			const expectedBuffer = Buffer.from(defaultDelegateUsername, 'utf8');
			const assetDelegateUsernameBuffer = getAssetDataForRegisterDelegateTransaction({
				delegate: {
					username: defaultDelegateUsername,
				},
			});

			(assetDelegateUsernameBuffer).should.be.eql(expectedBuffer);
		});
		it('should throw on missing username in the delegate asset', () => {
			(getAssetDataForRegisterDelegateTransaction.bind(null, { delegate: {} })).should.throw(
				'username is a required parameter.',
			);
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
			const expectedBuffer = Buffer.from(`+${defaultSenderPublicKey}+${defaultSenderSecondPublicKey}`, 'utf8');
			const assetVoteBuffer = getAssetDataForCastVotesTransaction(votesAsset);

			(assetVoteBuffer).should.be.eql(expectedBuffer);
		});

		it('should throw on missing votes in the vote asset', () => {
			(getAssetDataForCastVotesTransaction.bind(null, { votes: {} })).should.throw(
				'votes parameter must be an Array.',
			);
		});
	});

	describe('#getAssetDataForRegisterMultisignatureAccountTransaction', () => {
		const min = 2;
		const lifetime = 5;
		const keysgroup = ['+123456789', '-987654321'];
		let multisignatureAsset;
		beforeEach(() => {
			multisignatureAsset = {
				multisignature: {
					min,
					lifetime,
					keysgroup,
				},
			};
		});
		it('should return Buffer for multisignature asset', () => {
			const minBuffer = Buffer.alloc(1, min);
			const lifetimeBuffer = Buffer.alloc(1, lifetime);
			const keysgroupBuffer = Buffer.from('+123456789-987654321', 'utf8');

			const expectedBuffer = Buffer.concat([minBuffer, lifetimeBuffer, keysgroupBuffer]);
			const multisignatureBuffer = getAssetDataForRegisterMultisignatureAccountTransaction(
				multisignatureAsset,
			);

			(multisignatureBuffer).should.be.eql(expectedBuffer);
		});

		it('should throw on missing required parameters', () => {
			const requiredProperties = ['min', 'lifetime', 'keysgroup'];

			requiredProperties.forEach((parameter) => {
				const multisigAsset = Object.assign({}, multisignatureAsset.multisignature);
				delete multisigAsset[parameter];
				(getAssetDataForRegisterMultisignatureAccountTransaction.bind(null, { multisignature: multisigAsset })).should.throw(`${parameter} is a required parameter.`);
			});
		});
	});

	describe('#getAssetDataForCreateDappTransaction', () => {
		const defaultCategory = 0;
		const defaultDappName = 'Lisk Guestbook';
		const defaultDescription = 'The official Lisk guestbook';
		const defaultTags = 'guestbook message sidechain';
		const defaultType = 0;
		const defaultLink = 'https://github.com/MaxKK/guestbookDapp/archive/master.zip';
		const defaultIcon = 'https://raw.githubusercontent.com/MaxKK/guestbookDapp/master/icon.png';
		const dappNameBuffer = Buffer.from('TGlzayBHdWVzdGJvb2s=', 'base64');
		const dappDescriptionBuffer = Buffer.from('VGhlIG9mZmljaWFsIExpc2sgZ3Vlc3Rib29r', 'base64');
		const dappTagsBuffer = Buffer.from('Z3Vlc3Rib29rIG1lc3NhZ2Ugc2lkZWNoYWlu', 'base64');
		const dappLinkBuffer = Buffer.from('aHR0cHM6Ly9naXRodWIuY29tL01heEtLL2d1ZXN0Ym9va0RhcHAvYXJjaGl2ZS9tYXN0ZXIuemlw', 'base64');
		const dappIconBuffer = Buffer.from('aHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL01heEtLL2d1ZXN0Ym9va0RhcHAvbWFzdGVyL2ljb24ucG5n', 'base64');
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

			(dappBuffer).should.be.eql(expectedBuffer);
		});

		it('should throw for create dapp asset without required fields', () => {
			const dapp = {
				category: defaultCategory,
				name: defaultDappName,
				description: defaultDescription,
				tags: defaultTags,
				type: defaultType,
				link: defaultLink,
				icon: defaultIcon,
			};
			const requiredProperties = ['name', 'link', 'type', 'category'];

			requiredProperties.forEach((parameter) => {
				const dappClone = Object.assign({}, dapp);
				delete dappClone[parameter];
				(getAssetDataForCreateDappTransaction.bind(null, { dapp: dappClone })).should.throw(`${parameter} is a required parameter.`);
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
			const dappInTransferBuffer = getAssetDataForTransferIntoDappTransaction(dappInAsset);

			(dappInTransferBuffer).should.be.eql(expectedBuffer);
		});

		it('should throw on missing votes in the vote asset', () => {
			(getAssetDataForTransferIntoDappTransaction.bind(null, { inTransfer: {} })).should.throw(
				'dappId is a required parameter.',
			);
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
			const expectedBuffer = Buffer.concat([dappIdBuffer, transactionIdBuffer]);
			const dappOutTransferBuffer = getAssetDataForTransferOutOfDappTransaction(dappOutAsset);

			(dappOutTransferBuffer).should.be.eql(expectedBuffer);
		});

		it('should throw on missing votes in the vote asset', () => {
			(getAssetDataForTransferOutOfDappTransaction.bind(null, { outTransfer: {} })).should.throw(
				'dappId is a required parameter.',
			);
		});
	});

	describe('#checkTransaction', () => {
		const maxDataLength = 64;
		let defaultTransaction;
		beforeEach(() => {
			defaultTransaction = {
				type: 0,
				fee: 0.1 * fixedPoint,
				amount: defaultAmount,
				recipientId: defaultRecipient,
				timestamp: defaultTimestamp,
				asset: {},
				senderPublicKey: defaultSenderPublicKey,
				senderId: defaultSenderId,
				signature: defaultSignature,
				id: defaultTransactionId,
			};
		});
		it('should throw on too many data in send asset', () => {
			defaultTransaction.asset.data = new Array(maxDataLength + 1).fill('1').join('');
			(checkTransaction.bind(null, defaultTransaction)).should.throw('Transaction asset data exceeds size of 64.');
		});

		it('should return true on asset data exactly at max data length', () => {
			defaultTransaction.asset.data = new Array(maxDataLength).fill('1').join('');
			(checkTransaction(defaultTransaction)).should.be.true();
		});
	});

	describe('#isInvalidValue', () => {
		it('should return false on invalid values', () => {
			const allInvalidValues = [NaN, false, undefined];
			allInvalidValues.forEach((value) => {
				const invalid = isValidValue(value);
				(invalid).should.be.false();
			});
		});
		it('should return true on valid values', () => {
			const exampleValidValues = ['123', 123, { 1: 2, 3: 4 }, [1, 2, 3]];
			exampleValidValues.forEach((value) => {
				const valid = isValidValue(value);
				(valid).should.be.true();
			});
		});
	});
});
