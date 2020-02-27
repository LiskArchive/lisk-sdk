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
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import { MultisignatureTransaction } from '../src/12_multisignature_transaction';
import { Account, TransactionJSON } from '../src/transaction_types';
import { Status } from '../src/response';
import { defaultAccount, StateStoreMock } from './utils/state_store_mock';
/*
@TODO once registration is working update ProtocolSpec https://github.com/LiskHQ/lisk-sdk/pull/4608/files and replace here
import * as multisignatureFixture from '../fixtures/transaction_network_id_and_change_order/multi_signature_transaction_validate.json';
*/
import { validTransaction } from '../fixtures';

describe('Multisignature transaction class', () => {
	const multisigFixture = {
		multisigRegistration: {
			senderPublicKey:
				'0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
			timestamp: 77045780,
			type: 12,
			asset: {
				mandatoryKeys: [
					'4a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd39',
					'f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
				],
				optionalKeys: [
					'57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4',
					'fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6',
				],
				numberOfSignatures: 4,
			},
			signatures: [
				'b07f585b375dc48f02daa35304194958c75df3e34272183cc747b905b2815eeba9fcf71b18a4f688309c6dc03e4fa4d3882fe5d68f8ed90c804378349bc01e08',
				'9417165c89f820948e868754f7b2c803e8db10fea6d3b786a9e7de4a53b7bbcf6182d2a22eb5b8dfb7b39a387d977cd4a26528a30fce5dba3e1fbcb52514540f',
				'1139873f68c609473dae6371ca157c76d275a757abc239024e6f5b789dd2a32a59242004b26d78c1ddad85f34c70a5950e2adc538ed69628c313e5be6ea6080e',
				'6422099f1d9d539ca16534f8e07d87bb6fb7691f31d5dbe6a0b15378328bb88f8066f40ca8fca4fe0af156ef99a6727e87b91aaf0699beec40e56561dbd6ba09',
				'8bb8f306471a6c8f52fb6c186721d21501e81f6364ec394accc66fc5390cce6cc8b134c9abaea8c8bd951f47729f282603b8cd89be1ac07abeab7930ebec8f09',
			],
		},
		accounts: {
			targetAccount: {
				passphrase:
					'inherit moon normal relief spring bargain hobby join baby flash fog blood',
				privateKey:
					'de4a28610239ceac2ec3f592e36a2ead8ed4ac93cb16aa0d996ab6bb0249da2c0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
				publicKey:
					'0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
				address: '18141291412139607230L',
			},
			mandatoryOne: {
				passphrase:
					'trim elegant oven term access apple obtain error grain excite lawn neck',
				privateKey:
					'8a138c0dd8efe597c8b9c519af69e9821bd1e769cf0fb3490e22209e9cabfb8df1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
				publicKey:
					'f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
				address: '10481548956627905381L',
			},
			mandatoryTow: {
				passphrase:
					'desk deposit crumble farm tip cluster goose exotic dignity flee bring traffic',
				privateKey:
					'ddc8e19d6697d6e5c1dacf6576a7169752810999918212afe14d3978b354f8aa4a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd39',
				publicKey:
					'4a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd39',
				address: '3372320078773139180L',
			},
			optionalOne: {
				passphrase:
					'sugar object slender confirm clock peanut auto spice carbon knife increase estate',
				privateKey:
					'69aa94ea7ade3b7b08e277b18c1a590b2306ce5973ae8462b0b85122b180e89c57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4',
				publicKey:
					'57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4',
				address: '7745870967079479156L',
			},
			optionalTwo: {
				passphrase:
					'faculty inspire crouch quit sorry vague hard ski scrap jaguar garment limb',
				privateKey:
					'ffed38380998a90a2af9501f10182bc2a07922448ab383575b1e34aeddfa5482fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6',
				publicKey:
					'fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6',
				address: '7086965981385941478L',
			},
		},
	};

	let store: StateStoreMock;
	store = new StateStoreMock();

	const validMultisignatureRegistrationTransaction =
		multisigFixture.multisigRegistration;

	const targetMultisigAccount = {
		...defaultAccount,
		keys: {
			...defaultAccount.keys,
		},
		address: multisigFixture.accounts.targetAccount.address,
		balance: BigInt('94378900000'),
	};

	const convertedAccount = {
		...defaultAccount,
		address: multisigFixture.accounts.targetAccount.address,
		balance: BigInt('94378900000'),
		keys: {
			...multisigFixture.multisigRegistration.asset,
		},
	};

	const networkIdentifier =
		'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255';
	let validTestTransaction: MultisignatureTransaction;
	let multisignatureSender: Partial<Account>;
	let storeAccountCacheStub: jest.SpyInstance;
	let storeAccountGetStub: jest.SpyInstance;
	let storeAccountSetStub: jest.SpyInstance;
	beforeEach(async () => {
		validTestTransaction = new MultisignatureTransaction({
			...validMultisignatureRegistrationTransaction,
			networkIdentifier,
		});

		multisignatureSender = multisigFixture.accounts.targetAccount;

		storeAccountGetStub = jest
			.spyOn(store.account, 'getOrDefault')
			.mockResolvedValue({
				...defaultAccount,
				keys: defaultAccount.keys,
				address: multisigFixture.accounts.targetAccount.address,
			});

		storeAccountGetStub = jest
			.spyOn(store.account, 'get')
			.mockResolvedValue(targetMultisigAccount);

		storeAccountSetStub = jest.spyOn(store.account, 'set');
		storeAccountCacheStub = jest.spyOn(store.account, 'cache');
	});

	describe('#constructor', () => {
		it('should create instance of MultisignatureTransaction', async () => {
			expect(validTestTransaction).toBeInstanceOf(MultisignatureTransaction);
		});

		it('should set multisignature asset', async () => {
			expect(validTestTransaction.asset).toEqual(
				validMultisignatureRegistrationTransaction.asset,
			);
		});

		it.skip('should set fee to multisignature transaction fee amount', async () => {});
	});

	describe('#assetToBytes', () => {
		it('should return valid buffer', async () => {
			const assetBytes = (validTestTransaction as any).assetToBytes();

			expect(assetBytes).toEqual(
				Buffer.from(
					'02346136373634366134343633313364623936346333393337303335393834356335326663653932323561333932393737306566343134343863323538666433396631623966346565373162356435383537643362333436643434316361393637663237383730656265653838353639646233363466643133653238616462613302353764663563333831313936313933396638646366613835386336656165666562666161346465393432663765373033626638383132376530656539636361346661343036623639353264333737663032373839323065336562386461393139653463663563363862303265656261356438623333333466646330333639623604',
					'hex',
				),
			);
		});
	});

	describe('#verifyAgainstOtherTransactions', () => {
		it('should return status true with non conflicting transactions', async () => {
			const {
				errors,
				status,
			} = validTestTransaction.verifyAgainstOtherTransactions([
				validTransaction,
			] as ReadonlyArray<TransactionJSON>);

			expect(errors).toHaveLength(0);
			expect(status).toBe(Status.OK);
		});

		it('should return TransactionResponse with error when other transaction from same account has the same type', async () => {
			const conflictTransaction = {
				...validTransaction,
				senderPublicKey: multisigFixture.accounts.targetAccount.publicKey,
				type: 12,
			};
			const {
				errors,
				status,
			} = validTestTransaction.verifyAgainstOtherTransactions([
				conflictTransaction,
			] as ReadonlyArray<TransactionJSON>);

			expect(errors).toHaveLength(1);
			expect(status).toBe(Status.FAIL);
		});
	});

	describe('#assetToJSON', () => {
		it('should return an object of type transfer asset', async () => {
			expect(validTestTransaction.assetToJSON()).toEqual(
				validMultisignatureRegistrationTransaction.asset,
			);
		});
	});

	describe('#prepare', () => {
		it('should call state store with correct params', async () => {
			await validTestTransaction.prepare(store);
			// Derive addresses from public keys
			const mandatoryKeysAddressess = validTestTransaction.asset.mandatoryKeys.map(
				aKey => ({ address: getAddressFromPublicKey(aKey) }),
			);
			const optionalKeysAddressess = validTestTransaction.asset.optionalKeys.map(
				aKey => ({ address: getAddressFromPublicKey(aKey) }),
			);

			expect(storeAccountCacheStub).toHaveBeenCalledWith([
				{ address: validTestTransaction.senderId },
				...mandatoryKeysAddressess,
				...optionalKeysAddressess,
			]);
		});
	});

	describe('#validateSchema', () => {
		it('should return no errors', async () => {
			const errors = (validTestTransaction as any).validateAsset();
			expect(errors).toHaveLength(0);
		});

		it('should return error when numberOfSignatures is bigger than 64', async () => {
			const invalidTransaction = {
				...validMultisignatureRegistrationTransaction,
				asset: {
					...validMultisignatureRegistrationTransaction.asset,
					numberOfSignatures: 65,
				},
			};
			const transaction = new MultisignatureTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();

			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe(`'.numberOfSignatures' should be <= 64`);
		});

		it('should return error when optionalKeys includes invalid keys', async () => {
			const invalidTransaction = {
				...validMultisignatureRegistrationTransaction,
				asset: {
					...validMultisignatureRegistrationTransaction.asset,
					optionalKeys: validMultisignatureRegistrationTransaction.asset.optionalKeys.map(
						(key: string) => key.replace('f', 'x'),
					),
				},
			};
			const transaction = new MultisignatureTransaction(invalidTransaction);

			const errors = (transaction as any).validateAsset();
			expect(errors).toHaveLength(2);
		});

		it('should return error when mandatoryKeys includes invalid keys', async () => {
			const invalidTransaction = {
				...validMultisignatureRegistrationTransaction,
				asset: {
					...validMultisignatureRegistrationTransaction.asset,
					mandatoryKeys: validMultisignatureRegistrationTransaction.asset.mandatoryKeys.map(
						(key: string) => key.replace('f', 'x'),
					),
				},
			};
			const transaction = new MultisignatureTransaction(invalidTransaction);

			const errors = (transaction as any).validateAsset();
			expect(errors).toHaveLength(2);
		});

		it('should return error when mandatoryKeys has too many keys', async () => {
			const invalidTransaction = {
				...validMultisignatureRegistrationTransaction,
				asset: {
					...validMultisignatureRegistrationTransaction.asset,
					mandatoryKeys: [
						'0ae0ab0443a104dc538d8e504042139781a6ee83420b12d65c1a1dbb35397abe',
						'8f260b844d505a7d94e9c50cc85057c826705534d9ff9f58dc2b9743eba61d14',
						'abfb43d61e969062e1ddf1abcfb12e2f6d6b5b490615f4acfab76222bf72861a',
						'5d40580e8c8ad319a45559f33822c0f94163a00ec59127107cbc9ebd6c3f3919',
						'82fd499f675d19361b2949893c668008204c03b8c16c779279f8a34e1d1e66cc',
						'719f2e68ec2f191a1100c6a8cc7c8d7029badeea46acd6fe4030f2da506c744c',
						'928f1702c16a1dad5db6d5eaf2a19a3b7134a0c1476dd2d7dd6f73e234cc598d',
						'e8591d417051d4e0c6bc8367b6f09f4e3c2098b587b4a6d21018d75ede99e3a7',
						'2e213644a1fe00342c93ad9ea30cdc2af6d2da53c2613cbac2966262f499e5e4',
						'65c9dbeb9280c7643ae6207c5dd4867ba85c44976c87efadd0b57e2eb4d5d159',
						'91c805f2c95a8e89f9b27f0d0e824e21949af1a64ddf1f99dbc1de4e9fcd5058',
						'b1bb829261844de21a938cb14852eb2e6622b301d36429a7342128b5f717b430',
						'986a6726a4106b6b61b3032e2e0f3355090ab95b5d85bb2dad567cd746ba6249',
						'3d2aa90f5be3d63314678840e4f5e585ce32b6194e56a368aa444484516ffebc',
						'4b91e7c176e87fbbd6bdb514dc2525184a46468068eadfb73b8ed2a3c253f551',
						'ae99eca282dc9bad3d8cca99ba868c7844e5ca353cbbd8b02c54508d6de81bf4',
						'59ebe49bf5506028ae2059f2627a555f71c2ce8709068357fae497ff088ad88b',
						'5e5049ea89db852bde4d81b52cba0e915635fe95f39e90020ad182b7aa755e20',
						'85c12832b6d42272755c7177f3a2b4a763583ca54f94a08ade2bd5b5ba3d25fc',
						'1d477386ec8edcac7dd43e04d69b6f3eaf5d4b4accab2a58a92e874ea95ca7a2',
						'a3e1014a1b04bf7fad9ce90b458319675aed014373854adcbe9b916440b74f15',
						'4753f69f277041dca86d8e53837095cec0aed2675f9d3c9a3a80f3e0a5362cd7',
						'8b95411c417754770eb52485fdc2385ed198e513ee72db43d926db92eeec84f1',
						'b0bf02c1ebd1c1d82bb036aa5fac27a5c1bcd2a49ffcbe050a5fa8d53c35d9ca',
						'60e092183ad21af4f91d325ac7cb2afab95060d6402f081816f180ebc4526a67',
						'3280c52f4b83e76840a1fe98a23667dde1b7fe277a30ab9b2df3a6d3c559cdf8',
						'0bf8a93fe4f1f020cd90e7d45a7f28cc8753a71c21994eca5fe4f84cdb80bc82',
						'7db504b893c433ad1bf1a7baeb315b1329b4655836e06a328b9e2384201884d9',
						'bc4209302bf7c40c815337970650bf9683cefc3cfa4a1d6d441352f107be5895',
						'59600a6a170a0da1df773c3ae111c2ee938d79da60040d71db7440625facb630',
						'ae8504282e21724316e3317950e24f0b38bbacaecdb450f2ecb2eba1f5e6932f',
						'46122f81da4bd004a02dc542f8cb3b285c471f982d9684a94505dd6bf181edf5',
						'3c65e537c7308e862c457c5da9a5e0ab1d08a39e34b02f909a39f2b74c543aed',
						'85411b418de8a03e2c24777d41eafd5bbe7bff0c3c6d10d3d583fd82e4f854a7',
						'1a123271bc58ec351dba2ed56171eb53f4c2455a9466d884cba0c71a6d70c9b5',
						'f0a3c1e41d102e0dc1e07eb2c8ada5cf0c5795c1446aa2bfdf6307528ce6945a',
						'd894f206335f471a61d4af9a69756967eafa1f2d88052b1e5345544d529546c8',
						'114299018df7e5a44d8ada91827cdcbc128551c57b7a41806649c231240b236e',
						'1b107ec81b8a537dc3df57a2678106ba1db0ea44d3fdee7c1d44acf9dc8df6b4',
						'6d44775d424b9d4cf7878a9b202bf33fcc3777aea512052ac0100f9ce263b9e8',
						'fc4cb03857426b4e9236866cdfbf5acce1895d55bf62136848257531b297202e',
						'5239e7c876b6c699044e3503a9d94c7f5cc308b724e311a4ce224f0cb5131311',
						'a9f2c3b6a0b6de77778c3f4701d0d226d77fdbbe6bbbfa1f04a2b5ad319b80ce',
						'1386990cbba5deff14d72412bc8bba5656b732001a1da866e4d56969abdd497b',
						'db3c934f3fa77fb2b1cacb6bf2af79b4a3960d398b5eead14e887f212f2ad6e3',
						'38e01877a8f65f77bc3ddf23f049f0bb02812b024e0c04f8061b99196cefa2b3',
						'b0d0a7b20c5aba6032245bb836edb558e811667dc4fa858442435ee060b4b105',
						'6ba3891efa736e4e3f10d63d55162084f43e02c0ff942316b8535e17846bc644',
						'7bf4c5536da5a9ac818cfdac18ba76d3ac8ebb2747430712791dd9fca898fe49',
						'8ffd91a133cfb37bb67f951a15b4c6dd141fcfdf54a41b8117f2f96b2be2cc3c',
						'9780ffde1995f3417860197af2f78d9122f80c322d2e3fe7f3b5282d6013b145',
						'3ef50167c0a4e662f54f8e26f4cedf3130e79b335ed5b36cc4762c838165ee35',
						'f91c76a60e8642b6a176b165794be2ed8d9d0df2d4b9d669816d9fafa56d1bdb',
						'bfba2c7f9504e5fbf04a6a61879a8cdeb937b2ffacae5bce5c9e28dd8ce8401f',
						'ff5e44b923fe526c5b91f5eeb5d86aa15d5e9bf0439e7b5ab4ffe94a4d975a03',
						'958e0e0f69ffb13183f5a17615959caf9cda94a8c555a71d64c48597ddfe04ee',
						'70eddd0fb5f1b615decbf14da0cc682d833433dd96784390a105cee4e59e71e1',
						'ddd91ddbf19c70e05f6f16b2833879ea5f0e4f53b8709a69430fbd0834288c11',
						'fdddf36692068bfa95ee40ecac8331694a9dfef8d3aabd9fe84e945c8005f7f3',
						'54838b6aae920bd9205b39dc42aff4098421ed06a1b4efcf88d1de06318f8f3b',
						'fe19fa54f5fae4a53852731cbd0fcf58f596abf4fa04ee0fb4934ef312d17ec7',
						'611c771e859e59fdb2b4c37b8a6ecc8e250efca4261027231aeea05e6f6ca793',
						'241c6e079b308db183409bc33212cb0706df858c11cd99a3e9ff24b9f161d44c',
						'48e041ae61a32777c899c1f1b0a9588bdfe939030613277a39556518cc66d371',
						'483077a8b23208f2fd85dacec0fbb0b590befea0a1fcd76a5b43f33063aaa180',
					],
				},
			};
			const transaction = new MultisignatureTransaction(invalidTransaction);

			const errors = (transaction as any).validateAsset();
			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe(
				`'.mandatoryKeys' should NOT have more than 64 items`,
			);
		});

		it('should return error when optionalKeys has too many keys', async () => {
			const invalidTransaction = {
				...validMultisignatureRegistrationTransaction,
				asset: {
					...validMultisignatureRegistrationTransaction.asset,
					optionalKeys: [
						'0ae0ab0443a104dc538d8e504042139781a6ee83420b12d65c1a1dbb35397abe',
						'8f260b844d505a7d94e9c50cc85057c826705534d9ff9f58dc2b9743eba61d14',
						'abfb43d61e969062e1ddf1abcfb12e2f6d6b5b490615f4acfab76222bf72861a',
						'5d40580e8c8ad319a45559f33822c0f94163a00ec59127107cbc9ebd6c3f3919',
						'82fd499f675d19361b2949893c668008204c03b8c16c779279f8a34e1d1e66cc',
						'719f2e68ec2f191a1100c6a8cc7c8d7029badeea46acd6fe4030f2da506c744c',
						'928f1702c16a1dad5db6d5eaf2a19a3b7134a0c1476dd2d7dd6f73e234cc598d',
						'e8591d417051d4e0c6bc8367b6f09f4e3c2098b587b4a6d21018d75ede99e3a7',
						'2e213644a1fe00342c93ad9ea30cdc2af6d2da53c2613cbac2966262f499e5e4',
						'65c9dbeb9280c7643ae6207c5dd4867ba85c44976c87efadd0b57e2eb4d5d159',
						'91c805f2c95a8e89f9b27f0d0e824e21949af1a64ddf1f99dbc1de4e9fcd5058',
						'b1bb829261844de21a938cb14852eb2e6622b301d36429a7342128b5f717b430',
						'986a6726a4106b6b61b3032e2e0f3355090ab95b5d85bb2dad567cd746ba6249',
						'3d2aa90f5be3d63314678840e4f5e585ce32b6194e56a368aa444484516ffebc',
						'4b91e7c176e87fbbd6bdb514dc2525184a46468068eadfb73b8ed2a3c253f551',
						'ae99eca282dc9bad3d8cca99ba868c7844e5ca353cbbd8b02c54508d6de81bf4',
						'59ebe49bf5506028ae2059f2627a555f71c2ce8709068357fae497ff088ad88b',
						'5e5049ea89db852bde4d81b52cba0e915635fe95f39e90020ad182b7aa755e20',
						'85c12832b6d42272755c7177f3a2b4a763583ca54f94a08ade2bd5b5ba3d25fc',
						'1d477386ec8edcac7dd43e04d69b6f3eaf5d4b4accab2a58a92e874ea95ca7a2',
						'a3e1014a1b04bf7fad9ce90b458319675aed014373854adcbe9b916440b74f15',
						'4753f69f277041dca86d8e53837095cec0aed2675f9d3c9a3a80f3e0a5362cd7',
						'8b95411c417754770eb52485fdc2385ed198e513ee72db43d926db92eeec84f1',
						'b0bf02c1ebd1c1d82bb036aa5fac27a5c1bcd2a49ffcbe050a5fa8d53c35d9ca',
						'60e092183ad21af4f91d325ac7cb2afab95060d6402f081816f180ebc4526a67',
						'3280c52f4b83e76840a1fe98a23667dde1b7fe277a30ab9b2df3a6d3c559cdf8',
						'0bf8a93fe4f1f020cd90e7d45a7f28cc8753a71c21994eca5fe4f84cdb80bc82',
						'7db504b893c433ad1bf1a7baeb315b1329b4655836e06a328b9e2384201884d9',
						'bc4209302bf7c40c815337970650bf9683cefc3cfa4a1d6d441352f107be5895',
						'59600a6a170a0da1df773c3ae111c2ee938d79da60040d71db7440625facb630',
						'ae8504282e21724316e3317950e24f0b38bbacaecdb450f2ecb2eba1f5e6932f',
						'46122f81da4bd004a02dc542f8cb3b285c471f982d9684a94505dd6bf181edf5',
						'3c65e537c7308e862c457c5da9a5e0ab1d08a39e34b02f909a39f2b74c543aed',
						'85411b418de8a03e2c24777d41eafd5bbe7bff0c3c6d10d3d583fd82e4f854a7',
						'1a123271bc58ec351dba2ed56171eb53f4c2455a9466d884cba0c71a6d70c9b5',
						'f0a3c1e41d102e0dc1e07eb2c8ada5cf0c5795c1446aa2bfdf6307528ce6945a',
						'd894f206335f471a61d4af9a69756967eafa1f2d88052b1e5345544d529546c8',
						'114299018df7e5a44d8ada91827cdcbc128551c57b7a41806649c231240b236e',
						'1b107ec81b8a537dc3df57a2678106ba1db0ea44d3fdee7c1d44acf9dc8df6b4',
						'6d44775d424b9d4cf7878a9b202bf33fcc3777aea512052ac0100f9ce263b9e8',
						'fc4cb03857426b4e9236866cdfbf5acce1895d55bf62136848257531b297202e',
						'5239e7c876b6c699044e3503a9d94c7f5cc308b724e311a4ce224f0cb5131311',
						'a9f2c3b6a0b6de77778c3f4701d0d226d77fdbbe6bbbfa1f04a2b5ad319b80ce',
						'1386990cbba5deff14d72412bc8bba5656b732001a1da866e4d56969abdd497b',
						'db3c934f3fa77fb2b1cacb6bf2af79b4a3960d398b5eead14e887f212f2ad6e3',
						'38e01877a8f65f77bc3ddf23f049f0bb02812b024e0c04f8061b99196cefa2b3',
						'b0d0a7b20c5aba6032245bb836edb558e811667dc4fa858442435ee060b4b105',
						'6ba3891efa736e4e3f10d63d55162084f43e02c0ff942316b8535e17846bc644',
						'7bf4c5536da5a9ac818cfdac18ba76d3ac8ebb2747430712791dd9fca898fe49',
						'8ffd91a133cfb37bb67f951a15b4c6dd141fcfdf54a41b8117f2f96b2be2cc3c',
						'9780ffde1995f3417860197af2f78d9122f80c322d2e3fe7f3b5282d6013b145',
						'3ef50167c0a4e662f54f8e26f4cedf3130e79b335ed5b36cc4762c838165ee35',
						'f91c76a60e8642b6a176b165794be2ed8d9d0df2d4b9d669816d9fafa56d1bdb',
						'bfba2c7f9504e5fbf04a6a61879a8cdeb937b2ffacae5bce5c9e28dd8ce8401f',
						'ff5e44b923fe526c5b91f5eeb5d86aa15d5e9bf0439e7b5ab4ffe94a4d975a03',
						'958e0e0f69ffb13183f5a17615959caf9cda94a8c555a71d64c48597ddfe04ee',
						'70eddd0fb5f1b615decbf14da0cc682d833433dd96784390a105cee4e59e71e1',
						'ddd91ddbf19c70e05f6f16b2833879ea5f0e4f53b8709a69430fbd0834288c11',
						'fdddf36692068bfa95ee40ecac8331694a9dfef8d3aabd9fe84e945c8005f7f3',
						'54838b6aae920bd9205b39dc42aff4098421ed06a1b4efcf88d1de06318f8f3b',
						'fe19fa54f5fae4a53852731cbd0fcf58f596abf4fa04ee0fb4934ef312d17ec7',
						'611c771e859e59fdb2b4c37b8a6ecc8e250efca4261027231aeea05e6f6ca793',
						'241c6e079b308db183409bc33212cb0706df858c11cd99a3e9ff24b9f161d44c',
						'48e041ae61a32777c899c1f1b0a9588bdfe939030613277a39556518cc66d371',
						'483077a8b23208f2fd85dacec0fbb0b590befea0a1fcd76a5b43f33063aaa180',
					],
				},
			};
			const transaction = new MultisignatureTransaction(invalidTransaction);

			const errors = (transaction as any).validateAsset();
			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe(
				`'.optionalKeys' should NOT have more than 64 items`,
			);
		});

		it('should return errors when mandatory keys are not unique', async () => {
			const invalidTransaction = {
				...validMultisignatureRegistrationTransaction,
				asset: {
					...validMultisignatureRegistrationTransaction.asset,
					mandatoryKeys: [
						'f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
						'f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
					],
				},
			};

			const transaction = new MultisignatureTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();

			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe(
				`'.mandatoryKeys' should NOT have duplicate items (items ## 1 and 0 are identical)`,
			);
		});

		it('should return errors when optional keys are not unique', async () => {
			const invalidTransaction = {
				...validMultisignatureRegistrationTransaction,
				asset: {
					...validMultisignatureRegistrationTransaction.asset,
					optionalKeys: [
						'57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4',
						'57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4',
					],
				},
			};

			const transaction = new MultisignatureTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();

			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe(
				`'.optionalKeys' should NOT have duplicate items (items ## 1 and 0 are identical)`,
			);
		});
	});

	describe('#validateAsset', () => {
		it('should return errors when numberOfSignatures is bigger than the sum of all keys', async () => {
			const invalidTransaction = {
				...validMultisignatureRegistrationTransaction,
				asset: {
					...validMultisignatureRegistrationTransaction.asset,
					numberOfSignatures: 5,
				},
			};
			const transaction = new MultisignatureTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();

			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe(
				`The numberOfSignatures is bigger than the count of Mandatory and Optional keys`,
			);
		});

		it('should return errors when numberOfSignatures is smaller than mandatory key count', async () => {
			const invalidTransaction = {
				...validMultisignatureRegistrationTransaction,
				asset: {
					...validMultisignatureRegistrationTransaction.asset,
					numberOfSignatures: 1,
				},
			};
			const transaction = new MultisignatureTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();

			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe(
				`The numberOfSignatures needs to be equal or bigger than the number of Mandatory keys`,
			);
		});

		it('should return errors when mandatory and optional key sets are not disjointed', async () => {
			const invalidTransaction = {
				...validMultisignatureRegistrationTransaction,
				asset: {
					...validMultisignatureRegistrationTransaction.asset,
					numberOfSignatures: 2,
					mandatoryKeys: [
						'48e041ae61a32777c899c1f1b0a9588bdfe939030613277a39556518cc66d371',
						'483077a8b23208f2fd85dacec0fbb0b590befea0a1fcd76a5b43f33063aaa180',
					],
					optionalKeys: [
						'483077a8b23208f2fd85dacec0fbb0b590befea0a1fcd76a5b43f33063aaa180',
					],
				},
			};
			const transaction = new MultisignatureTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();

			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe(
				`Invalid combination of Mandatory and Optional keys`,
			);
		});

		it('should return errors when mandatory keys set is not sorted', async () => {
			const invalidTransaction = {
				...validMultisignatureRegistrationTransaction,
				asset: {
					...validMultisignatureRegistrationTransaction.asset,
					numberOfSignatures: 2,
					mandatoryKeys: [
						'48e041ae61a32777c899c1f1b0a9588bdfe939030613277a39556518cc66d371',
						'483077a8b23208f2fd85dacec0fbb0b590befea0a1fcd76a5b43f33063aaa180',
					],
				},
			};
			const transaction = new MultisignatureTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();

			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe(
				`Mandatory keys should be sorted lexicographically`,
			);
		});

		it('should return errors when optional keys set is not sorted', async () => {
			const invalidTransaction = {
				...validMultisignatureRegistrationTransaction,
				asset: {
					...validMultisignatureRegistrationTransaction.asset,
					numberOfSignatures: 2,
					optionalKeys: [
						'48e041ae61a32777c899c1f1b0a9588bdfe939030613277a39556518cc66d371',
						'483077a8b23208f2fd85dacec0fbb0b590befea0a1fcd76a5b43f33063aaa180',
					],
				},
			};
			const transaction = new MultisignatureTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();

			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe(
				`Optional keys should be sorted lexicographically`,
			);
		});
	});

	describe('#verifySignatures', () => {
		it('should not fail to validate valid signatures', async () => {
			const result = await validTestTransaction.verifySignatures(store);
			expect(result.status).toBe(1);
			expect(result.errors.length).toBe(0);
		});

		it('should return error if first signature is not from the sender public key', async () => {
			const invalidTransaction = {
				...validMultisignatureRegistrationTransaction,
				asset: {
					...validMultisignatureRegistrationTransaction.asset,
				},
				signatures: [...validMultisignatureRegistrationTransaction.signatures],
				networkIdentifier,
			};

			invalidTransaction.signatures.shift();

			const invalid = new MultisignatureTransaction(invalidTransaction);

			const result = await invalid.verifySignatures(store);
			expect(result.status).toBe(0);
			expect(result.errors[0].message).toBe(
				`Failed to validate signature 9417165c89f820948e868754f7b2c803e8db10fea6d3b786a9e7de4a53b7bbcf6182d2a22eb5b8dfb7b39a387d977cd4a26528a30fce5dba3e1fbcb52514540f`,
			);
		});

		it('should return error if any of the mandatory signatures is not valid', async () => {
			const invalidTransaction = {
				...validMultisignatureRegistrationTransaction,
				asset: {
					...validMultisignatureRegistrationTransaction.asset,
				},
				signatures: [...validMultisignatureRegistrationTransaction.signatures],
				networkIdentifier,
			};

			// this is the first mandatory signature from the fixture
			invalidTransaction.signatures[1] = invalidTransaction.signatures[1].replace(
				'e',
				'f',
			);

			const invalid = new MultisignatureTransaction(invalidTransaction);

			const result = await invalid.verifySignatures(store);
			expect(result.status).toBe(0);
			expect(result.errors[0].message).toBe(
				`Failed to validate signature 9417165c89f820948f868754f7b2c803e8db10fea6d3b786a9e7de4a53b7bbcf6182d2a22eb5b8dfb7b39a387d977cd4a26528a30fce5dba3e1fbcb52514540f`,
			);
		});

		it('should return error if any of the optional signatures is not valid', async () => {
			const invalidTransaction = {
				...validMultisignatureRegistrationTransaction,
				asset: {
					...validMultisignatureRegistrationTransaction.asset,
				},
				signatures: [...validMultisignatureRegistrationTransaction.signatures],
				networkIdentifier,
			};

			// this is the first optional signature from the fixture
			invalidTransaction.signatures[3] = invalidTransaction.signatures[3].replace(
				'e',
				'9',
			);

			const invalid = new MultisignatureTransaction(invalidTransaction);

			const result = await invalid.verifySignatures(store);
			expect(result.status).toBe(0);
			expect(result.errors[0].message).toBe(
				`Failed to validate signature 6422099f1d9d539ca16534f8907d87bb6fb7691f31d5dbe6a0b15378328bb88f8066f40ca8fca4fe0af156ef99a6727e87b91aaf0699beec40e56561dbd6ba09`,
			);
		});
	});

	describe('#applyAsset', () => {
		it('should call state store', async () => {
			await (validTestTransaction as any).applyAsset(store);
			expect(storeAccountGetStub).toHaveBeenCalledWith(
				validTestTransaction.senderId,
			);

			expect(storeAccountSetStub).toHaveBeenCalledWith(
				multisigFixture.accounts.targetAccount.address,
				convertedAccount,
			);
		});

		it('should return no errors', async () => {
			storeAccountGetStub.mockReturnValue({
				...targetMultisigAccount,
				keys: {
					numberOfSignatures: 0,
					mandatoryKeys: [],
					optionalKeys: [],
				},
			});
			const errors = await (validTestTransaction as any).applyAsset(store);

			expect(errors).toHaveLength(0);
		});

		it('should return error when account is already multisignature', async () => {
			storeAccountGetStub.mockReturnValue(targetMultisigAccount);
			const errors = await (validTestTransaction as any).applyAsset(store);
			expect(errors).toHaveLength(1);
			expect(errors[0].dataPath).toBe('.signatures');
		});
	});

	describe('#undoAsset', () => {
		it('should call state store', async () => {
			await (validTestTransaction as any).undoAsset(store);
			expect(storeAccountGetStub).toHaveBeenCalledWith(
				multisignatureSender.address,
			);
			expect(storeAccountSetStub).toHaveBeenCalledWith(
				multisignatureSender.address,
				{
					...targetMultisigAccount,
					keys: {
						numberOfSignatures: 0,
						mandatoryKeys: [],
						optionalKeys: [],
					},
				},
			);
		});

		it('should return no errors', async () => {
			const errors = await (validTestTransaction as any).undoAsset(store);
			expect(errors).toHaveLength(0);
		});
	});
});
