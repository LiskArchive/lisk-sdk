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

const crypto = require('crypto');
const rewire = require('rewire');
const ed = require('../../../helpers/ed');
const Bignum = require('../../../helpers/bignum.js');
const modulesLoader = require('../../common/modules_loader');
const transactionTypes = require('../../../helpers/transaction_types.js');

const { FEES } = __testContext.config.constants;

const Block = rewire('../../../logic/block.js');

const validPassphrase =
	'robust weapon course unknown head trial pencil latin acid';
const validKeypair = ed.makeKeypair(
	crypto
		.createHash('sha256')
		.update(validPassphrase, 'utf8')
		.digest()
);

const validDataForBlock = {
	keypair: validKeypair,
	timestamp: 41898500,
	previousBlock: {
		version: 0,
		totalAmount: new Bignum('0'),
		totalFee: new Bignum('0'),
		reward: new Bignum('0'),
		payloadHash:
			'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
		timestamp: 41898490,
		numberOfTransactions: 0,
		payloadLength: 0,
		previousBlock: '1087874036928524397',
		generatorPublicKey:
			'1cc68fa0b12521158e09779fd5978ccc0ac26bf99320e00a9549b542dd9ada16',
		transactions: [],
		blockSignature:
			'8a727cc77864b6fc81755a1f4eb4796b68f4a943d69c74a043b5ca422f3b05608a22da4a916ca7b721d096129938b6eb3381d75f1a116484d1ce2be4904d9a0e',
		height: 69,
		id: '3920300554926889269',
		relays: 1,
	},
	transactions: [],
};

const invalidBlock = {
	version: '0',
	totalAmount: 'qwer',
	totalFee: 'sd#$%',
	reward: new Bignum('0'),
};

const blockData = validDataForBlock.previousBlock;

const transactionsByTypes = {};
transactionsByTypes[transactionTypes.MULTI] = {
	type: 4,
	amount: new Bignum('0'),
	senderPublicKey:
		'7e632b62d6230bfc15763f06bf82f7e20cf06a2d8a356850e0bdab30db3506cc',
	timestamp: 41898871,
	asset: {
		multisignature: {
			min: 15,
			keysgroup: [
				'+2f57dcb099eda355fa2577ebe994fe5d8a6a01c1926bd317dd0326c2029e47a9',
				'+f0612905f5b7a7c1e3b32cdb9801df3431441d03b4b00995211114495c71949a',
				'+fdf0de469127d5b49fb45c5c240cf96cac6391156908d5e92998ddf0855ed2ef',
				'+b515673c1e9f2249f84456b5d79c0e283bd56ac46b1f309549eac8fa489b787a',
				'+fe5101e08bbacac9eb008d4b4e4afc4ff21ea989956fd8ef0fe2a2fb600091cb',
				'+5d6d1d2f86a1fbf851434c826a763261bf6019544013e526076bb689c37096ef',
				'+9dbd12cea90057a3b5323c69140c61f98bc7e9e3c033264c7b2652db35cf12e6',
				'+56ea0e04273e6fdd45be4e61464e6eef7e5b9a8d38127bab2c0730bf8545dbad',
				'+f570825ef2cf7b058881a37df2ee1be593867e6b0ad2a4f51e435857051f0aec',
				'+da2f5cbb34914590776e142d81d0614a8d8c967574de3e6e0d6c74fd2e4c73f4',
				'+df727cb7f913d235040aea33a8b9d506c310aeb1afdea4d997ff4a333942a1c5',
				'+b19ae6459ea5307a7ffada806a2b0fb3d69aaf8017479148847edf4518b59584',
				'+b2a2045281d9db97ab130afa35aa402d208481f4d15bce804053502fe0e5f742',
				'+e0e7be96e5ddd6f89026d59183bdf7fc40dcf7f524c4092d778330913eebc82f',
				'+6d834168362e11d409b9e326ceea89f41d05d2742ee24066205ab1f87bbcf9c4',
			],
			lifetime: 9,
		},
	},
	signature:
		'3b064ec3b4d21311c5ab3b6621eecf91b9c9398fafdd743e05d53b75a2a37aedb8c0f81e3f32981f7bc42b1a5d4f8aa697e1684e55d853dc2c4964538fedf101',
	id: '4505208715241906348',
	fee: new Bignum(8000000000),
	senderId: '8885132815244884080L',
	relays: 1,
	receivedAt: '2017-09-21T15:34:31.532Z',
	signatures: [
		'2087dab4154e44e81adb2b93f2e7daab083e824af9986ae897819727dc41583f86498361efee23acbbec319b81f26ac00eebac3b5019e8f0e145937de32f5303',
		'bab64c25c72a310cd5964bdf3d4ff56d65e53b460f17990b09fdf0f63d53310edcb9a7a54b542d23efa2603f15eb52356dee7a11d7e0fd0270efdd297de3ff0e',
		'a4e3df423674aea8a62c8a3014407200d6317c95a07f34606a83a911bfe9f1cdc1c2fac3c946655a1781bc4496542ef1b3e4e791ea4ac7d6229b29e56b673102',
		'b6a5c220421d2bc4fed8f912fa8f37a2d42762b592c92b102fc552be60a6a5a2232b065d83c0b50ef74a09e132603a9b70d71c7417b91d9cae012c292faa3901',
		'820df86ab4e5c8f383cfd80990d620fa6f9d66995b5e58b76a8a02c9478d1548539c9e0fb19576f056c27daaf9a9a1ae06114a362131c01f5f7d02cfe27c080a',
		'a9fe643d6dedc1d875a3adbddceb8af94e1755db329492f4c4ff4d429a3354d6ed18e060e96cfb2b2106107649baba7b0bf4a162c4c3261540d1fbcc1351190e',
		'a351d25887e63f9e53534461aa627a8c16c8c33eeb2928ee34ba03968cc5dca8ba7831e3f396f506c903b9e3b8049729502400190cf0a82b4d53a76df7e99808',
		'390559f87575c280de63099b0aa9266fe918dfb7a487f821cc16bea568116e75b0c3215634aaf6f64e7130e38fa32686573741386dcd5ef0aa84ca4ba850d405',
		'0671a9a3cfdd85ecd54218468254b2f007bbaa613b0b140a5a4a727af3e3c840d952675c6dbbd3f55bee4f2f3aa4bb1331f8e4dcc925c85e0eaf2ad208ae6a06',
		'f6808ff0fb6aa387e3b2cad29d3930a7768b634eac128531c84129eddace3ab9c54316820f497cd6f50b61a83d85811cec4e94e4a50350a982dfba65aea44f00',
		'b75f4815f5ae1f55019001dc94110d7b93c1806ce2ea75a07b969fcfd9e09ac743d0d5dfff110849c675952a7030fd97fce93de9357c5fa601ca62f96e96ef03',
		'bab8ef2384253ea26d6e2b9c22301d2cb7fdabdfce7ffbdf63e0f8e6001a12e5a749cacf5ea01fbb4335a9163654ba1a41154696bb2344384298af79910c9904',
		'874ff0769edb4c1078b81099b18414e66c898c6d32e507d98fe0aaa9f7d9fa2e7069745591aa7d73373ab639282b8b3c63e64d82d601ebaf73e2f02701fd4005',
		'8b7ceafb67380ae4811a9db63487091c69712eea211be2ebbdaeb5fbfd99bdc9ef82db15553de172b28fc14abbbf1005cc81ba5f3740101eb63d4d65a408000b',
		'430cc8ed8008d3270cc15a59b3d11143e70ac606ab4de67edb3e6ba984787bf80a1692c24bd5bbb15d1ec9d4c27dd863deda093d6ab882083b68949c4a51fa0b',
	],
	ready: true,
};

transactionsByTypes[transactionTypes.DAPP] = {
	type: 5,
	amount: new Bignum('0'),
	senderPublicKey:
		'7e632b62d6230bfc15763f06bf82f7e20cf06a2d8a356850e0bdab30db3506cc',
	timestamp: 41898871,
	asset: {
		dapp: {
			category: 4,
			name: 'AjFJheh3RFKiFTecCylXhW',
			description: 'A dapp added via API autotest',
			tags:
				'handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate',
			type: 0,
			link: 'https://github.com/AjFJheh3RFKiFTecCylXhW/master.zip',
			icon:
				'https://raw.githubusercontent.com/MaxKK/guestbookDapp/master/icon.png',
		},
	},
	signature:
		'655fd2c24c490f9a540dfe833561e4b8f85c4dafce6fe7f696f52c5a3535ba562e11ffeb1479b01967d8f20ed87fe8c9ac58522ea28948e52ec1eba57f675104',
	id: '16047960743788123485',
	fee: new Bignum(2500000000),
	senderId: '8885132815244884080L',
	relays: 1,
	receivedAt: '2017-09-21T15:34:31.801Z',
};

transactionsByTypes[transactionTypes.VOTE] = {
	type: 3,
	amount: new Bignum('0'),
	senderPublicKey:
		'7e632b62d6230bfc15763f06bf82f7e20cf06a2d8a356850e0bdab30db3506cc',
	timestamp: 41898871,
	asset: {
		votes: [
			'+addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
		],
	},
	recipientId: '8885132815244884080L',
	signature:
		'e8fb21b923ed5b5d2ad0eced31b0a966d9dfb71f710ec6e745c96c9e806ac42225a81e8140614541b0b9055c5511ea8f2d82008f9ccb1bb432772960614d9602',
	id: '17417762698516786715',
	fee: new Bignum(100000000),
	senderId: '8885132815244884080L',
	relays: 1,
	receivedAt: '2017-09-21T15:34:31.780Z',
};

transactionsByTypes[transactionTypes.DELEGATE] = {
	type: 2,
	amount: new Bignum('0'),
	senderPublicKey:
		'7e632b62d6230bfc15763f06bf82f7e20cf06a2d8a356850e0bdab30db3506cc',
	timestamp: 41898871,
	asset: {
		delegate: {
			username: 'gximrm9vf2omzarpsw',
			publicKey:
				'7e632b62d6230bfc15763f06bf82f7e20cf06a2d8a356850e0bdab30db3506cc',
		},
	},
	signature:
		'77b0fcb420450e2d02e98d05af50d3577438ba19f38249ac301e9da07ec65a0889309b242642d3b4df7570d70be09adc80e56e68a0ecb9eb72b3ab5070248c0d',
	id: '14164546323350881168',
	fee: new Bignum(2500000000),
	senderId: '8885132815244884080L',
	relays: 1,
	receivedAt: '2017-09-21T15:34:31.752Z',
};

transactionsByTypes[transactionTypes.SIGNATURE] = {
	type: 1,
	amount: new Bignum('0'),
	senderPublicKey:
		'7e632b62d6230bfc15763f06bf82f7e20cf06a2d8a356850e0bdab30db3506cc',
	timestamp: 41898871,
	asset: {
		signature: {
			publicKey:
				'6052f504732ffffa30311f4975d2da8f83e3089fa91aab33dc79f76da78b7c8f',
		},
	},
	signature:
		'a54c6adf96879163ac0b36563f2ff701a9f033bedf7746cef79e8f4de503fbb461322b8b8ebe07c40d5dd484f073e69256fac284af5b507952e7666b693c9b07',
	id: '17912996692061248739',
	fee: new Bignum(500000000),
	senderId: '8885132815244884080L',
	relays: 1,
	receivedAt: '2017-09-21T15:34:31.718Z',
};

transactionsByTypes[transactionTypes.SEND] = {
	type: 0,
	amount: new Bignum('1'),
	senderPublicKey:
		'7e632b62d6230bfc15763f06bf82f7e20cf06a2d8a356850e0bdab30db3506cc',
	timestamp: 41898871,
	asset: {},
	recipientId: '10881167371402274308L',
	signature:
		'ec703b28601a0aaf4141a85493dda1b00a3604fc4903513cc311dbf995b39b41b30241b17d6be2ac281c0b8b2ff5b7031b86ce9a5e0c3a545b76e935f372da06',
	id: '18141417978934746512',
	fee: new Bignum(10000000),
	senderId: '8885132815244884080L',
	relays: 1,
	receivedAt: '2017-09-21T15:34:31.689Z',
};

transactionsByTypes[transactionTypes.IN_TRANSFER] = {
	id: '2273003018673898961',
	type: 6,
	timestamp: 40420761,
	senderPublicKey:
		'6dc3f3f8bcf9fb689a1ec6703ed08c649cdc98619ac4689794bf72b579d6cf25',
	senderId: '2623857243537009424L',
	recipientId: null,
	recipientPublicKey: null,
	amount: new Bignum('999'),
	fee: new Bignum(10000000),
	signature:
		'46b57a56f3a61c815224e4396c9c39316ca62568951f84c2e7404225cf67c489f517db6a848a0a5fd4f311b98102c36098543cecb277c7d039a07ed069d90b0b',
	asset: {
		inTransfer: {
			dappId: '7400202127695414450',
		},
	},
};

transactionsByTypes[transactionTypes.OUT_TRANSFER] = {
	id: '12010334009048463571',
	type: 7,
	timestamp: 41287231,
	senderPublicKey:
		'8d556dca10bb8294895df5477117ca2ceaae7795e7ffc4f7c7d51398a65e4911',
	senderId: '12566082625150495618L',
	recipientId: '477547807936790449L',
	amount: new Bignum('100'),
	fee: new Bignum('10000000'),
	signature:
		'126de9603da232b0ada5158c43640849a62736351be1f39cd98606f6d81bedff895183f12c517c96dcc71368af111e7ddde04f62c54ecd1ea47d557af69f330d',
	asset: {
		outTransfer: {
			dappId: '4163713078266524209',
			transactionId: '14144353162277138821',
		},
	},
};

function expectedOrderOfTransactions(sortedTransactions) {
	let sorted = true;

	for (let i = 0; i < sortedTransactions.length - 1; i++) {
		// Transactions should always be in ascending order of types unless next transaction is MULTI
		if (
			sortedTransactions[i].type > sortedTransactions[i + 1].type &&
			sortedTransactions[i + 1].type !== transactionTypes.MULTI
		) {
			sorted = false;
			return sorted;
		}

		// MULTI transaction should always come after all transaction types
		if (
			sortedTransactions[i].type < sortedTransactions[i + 1].type &&
			sortedTransactions[i].type === transactionTypes.MULTI
		) {
			sorted = false;
			return sorted;
		}

		// Within transaction types, the transactions should be ordered in descending order of amount
		if (
			sortedTransactions[i].type === sortedTransactions[i + 1].type &&
			sortedTransactions[i].amount < sortedTransactions[i + 1].amount
		) {
			sorted = false;
			return sorted;
		}
	}

	return sorted;
}

describe('block', () => {
	let block;
	let data;
	let transactionStub;
	let transactions = [];

	before(done => {
		transactionStub = {
			getBytes: sinonSandbox.stub(),
			objectNormalize: sinonSandbox.stub(),
		};

		block = new Block(
			modulesLoader.scope.ed,
			modulesLoader.scope.schema,
			transactionStub
		);
		done();
	});

	beforeEach(done => {
		data = _.cloneDeep(validDataForBlock);
		transactions = _.values(transactionsByTypes);
		done();
	});

	describe('create', () => {
		let blockNormalizeStub;

		before(() => {
			blockNormalizeStub = sinonSandbox
				.stub(block, 'objectNormalize')
				.returnsArg(0);

			transactionStub.getBytes.returns(Buffer.from('dummy transaction bytes'));
			return transactionStub.objectNormalize.returnsArg(0);
		});

		after(() => {
			blockNormalizeStub.reset();
			transactionStub.getBytes.reset();
			return transactionStub.objectNormalize.reset();
		});

		describe('when each of all supported', () => {
			let generatedBlock;
			let transactionsOrder;
			const correctOrder = [0, 1, 2, 3, 5, 6, 7, 4];

			beforeEach(done => {
				data.transactions = transactions;
				generatedBlock = block.create(data);
				transactionsOrder = generatedBlock.transactions.map(trs => {
					return trs.type;
				});
				done();
			});

			it('should sort transactions in the correct order', () => {
				return expect(transactionsOrder).to.eql(correctOrder);
			});
		});

		describe('when there are multiple multisignature transactions', () => {
			const correctOrderOfTransactions = [
				0,
				1,
				2,
				3,
				5,
				6,
				7,
				4,
				4,
				4,
				4,
				4,
				4,
			];

			describe('in the beginning', () => {
				let multipleMultisigTx;
				let generatedBlock;
				let transactionsOrder;

				beforeEach(done => {
					// Create 6 multisignature transactions
					multipleMultisigTx = Array(...Array(5)).map(() => {
						return transactionsByTypes[transactionTypes.MULTI];
					});
					data.transactions = multipleMultisigTx.concat(transactions);
					generatedBlock = block.create(data);
					transactionsOrder = generatedBlock.transactions.map(trs => {
						return trs.type;
					});
					done();
				});

				it('should sort transactions in the correct order', () => {
					expect(
						expectedOrderOfTransactions(generatedBlock.transactions)
					).to.equal(true);
					return expect(transactionsOrder).to.eql(correctOrderOfTransactions);
				});
			});

			describe('at the middle', () => {
				let multipleMultisigTx;
				let generatedBlock;
				let transactionsOrder;

				beforeEach(done => {
					multipleMultisigTx = Array(...Array(5)).map(() => {
						return transactionsByTypes[transactionTypes.MULTI];
					});
					// Add multisig transactions after the 3rd transaction in array
					transactions.splice(...[3, 0].concat(multipleMultisigTx));
					data.transactions = transactions;
					generatedBlock = block.create(data);
					transactionsOrder = generatedBlock.transactions.map(trs => {
						return trs.type;
					});
					done();
				});

				it('should sort transactions in the correct order', () => {
					expect(
						expectedOrderOfTransactions(generatedBlock.transactions)
					).to.equal(true);
					return expect(transactionsOrder).to.eql(correctOrderOfTransactions);
				});
			});

			describe('at the end', () => {
				let multipleMultisigTx;
				let generatedBlock;
				let transactionsOrder;

				beforeEach(done => {
					multipleMultisigTx = Array(...Array(5)).map(() => {
						return transactionsByTypes[transactionTypes.MULTI];
					});
					data.transactions = transactions.concat(multipleMultisigTx);
					generatedBlock = block.create(data);
					transactionsOrder = generatedBlock.transactions.map(trs => {
						return trs.type;
					});
					done();
				});

				it('should sort transactions in the correct order', () => {
					expect(
						expectedOrderOfTransactions(generatedBlock.transactions)
					).to.equal(true);
					return expect(transactionsOrder).to.eql(correctOrderOfTransactions);
				});
			});

			describe('shuffled', () => {
				let multipleMultisigTx;
				let generatedBlock;
				let transactionsOrder;

				beforeEach(done => {
					// Create 6 multisignature transactions
					multipleMultisigTx = Array(...Array(5)).map(() => {
						return transactionsByTypes[transactionTypes.MULTI];
					});
					data.transactions = _.shuffle(
						transactions.concat(multipleMultisigTx)
					);
					generatedBlock = block.create(data);
					transactionsOrder = generatedBlock.transactions.map(trs => {
						return trs.type;
					});
					done();
				});

				it('should sort transactions in the correct order', () => {
					expect(
						expectedOrderOfTransactions(generatedBlock.transactions)
					).to.equal(true);
					return expect(transactionsOrder).to.eql(correctOrderOfTransactions);
				});
			});
		});
	});

	describe('sign', () => {
		it('should throw error for empty block and validKeypair', () => {
			return expect(() => {
				block.sign({}, validKeypair);
			}).to.throw();
		});

		it('should throw error for invalid key pair and valid blockData', () => {
			return expect(() => {
				block.sign(blockData, 'this is invalid key pair');
			}).to.throw();
		});

		it('should throw error for a block with unknown fields', () => {
			const unknownBlock = {
				verson: 0,
				totlFee: '&**&^&',
				rewrd: 'g@n!a',
			};

			return expect(() => {
				block.sign(unknownBlock, 'this is invalid key pair');
			}).to.throw();
		});

		it('should return valid signature when sign block using valid keypair', () => {
			const signature = block.sign(blockData, validKeypair);
			expect(signature).to.be.a('string');
			return expect(signature).to.have.length.of(128);
		});
	});

	describe('getBytes', () => {
		it('should throw error for invalid block', () => {
			return expect(() => {
				block.getBytes(invalidBlock);
			}).to.throw();
		});

		it('should return a buffer for a given block', () => {
			return expect(block.getBytes(blockData)).to.be.an.instanceof(Buffer);
		});

		it('should return same bytes for a given block', () => {
			const bytes1 = block.getBytes(blockData);
			const bytes2 = block.getBytes(blockData);
			return expect(bytes1).to.deep.equal(bytes2);
		});

		it('should return different bytes for different blocks', () => {
			const bytes1 = block.getBytes(blockData);
			const blockDataCopy = Object.assign({}, blockData);
			blockDataCopy.height = 100;
			blockDataCopy.generatorPublicKey =
				'7e632b62d6230bfc15763f06bf82f7e20cf06a2d8a356850e0bdab30db3506cc';
			const bytes2 = block.getBytes(blockDataCopy);
			return expect(bytes1).to.not.deep.equal(bytes2);
		});
	});

	describe('verifySignature', () => {
		it('should throw error for invalid block', () => {
			return expect(() => {
				block.verifySignature(invalidBlock);
			}).to.throw();
		});

		it('should return true for a good block', () => {
			return expect(block.verifySignature(blockData)).to.be.true;
		});

		it('should return false for a block with modified version', () => {
			const blockCopy = Object.assign({}, blockData);
			blockCopy.version += 1;
			return expect(block.verifySignature(blockCopy)).to.be.false;
		});

		it('should return false for a block with modified timestamp', () => {
			const blockCopy = Object.assign({}, blockData);
			blockCopy.timestamp += 1;
			return expect(block.verifySignature(blockCopy)).to.be.false;
		});

		it('should return false for a block with modified previousBlock', () => {
			const blockCopy = Object.assign({}, blockData);
			blockCopy.previousBlock = '1111112222333333';
			return expect(block.verifySignature(blockCopy)).to.be.false;
		});

		it('should return false for a block with modified numberOfTransactions', () => {
			const blockCopy = Object.assign({}, blockData);
			blockCopy.numberOfTransactions += 1;
			return expect(block.verifySignature(blockCopy)).to.be.false;
		});

		it('should return false for a block with modified totalAmount', () => {
			const blockCopy = Object.assign({}, blockData);
			blockCopy.totalAmount += 1;
			return expect(block.verifySignature(blockCopy)).to.be.false;
		});

		it('should return false for a block with modified totalFee', () => {
			const blockCopy = Object.assign({}, blockData);
			blockCopy.totalFee += 1;
			return expect(block.verifySignature(blockCopy)).to.be.false;
		});

		it('should return false for a block with modified reward', () => {
			const blockCopy = Object.assign({}, blockData);
			blockCopy.reward += 1;
			return expect(block.verifySignature(blockCopy)).to.be.false;
		});

		it('should return false for a block with modified payloadLength', () => {
			const blockCopy = Object.assign({}, blockData);
			blockCopy.payloadLength += 1;
			return expect(block.verifySignature(blockCopy)).to.be.false;
		});

		it('should return false for a block with modified payloadHash', () => {
			const blockCopy = Object.assign({}, blockData);
			blockCopy.payloadHash =
				'aabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd';
			return expect(block.verifySignature(blockCopy)).to.be.false;
		});

		it('should return false for a block with modified generatorPublicKey', () => {
			const blockCopy = Object.assign({}, blockData);
			blockCopy.generatorPublicKey =
				'aabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd';
			return expect(block.verifySignature(blockCopy)).to.be.false;
		});

		it('should return false for a block with modified blockSignature', () => {
			const blockCopy = Object.assign({}, blockData);
			blockCopy.blockSignature =
				'aabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd';
			return expect(block.verifySignature(blockCopy)).to.be.false;
		});
	});

	describe('getId', () => {
		it('should throw an error for empty block', () => {
			return expect(() => {
				block.getId({});
			}).to.throw();
		});

		it('should return the id for a given block', () => {
			return expect(block.getId(blockData))
				.to.be.a('string')
				.which.is.equal(blockData.id);
		});
	});

	describe('getHash', () => {
		it('should throw error for invalid block', () => {
			return expect(() => {
				block.getHash(invalidBlock);
			}).to.throw();
		});

		it('should return a hash for a given block', () => {
			return expect(block.getHash(blockData)).to.be.an.instanceof(Buffer);
		});
	});

	describe('calculateFee', () => {
		it('should return the constant fee', () => {
			return expect(block.calculateFee(blockData).isEqualTo(FEES.SEND)).to.be
				.true;
		});
	});

	describe('dbRead', () => {
		it('should throw error for null values', () => {
			return expect(() => {
				block.dbRead(null);
			}).to.throw();
		});

		it('should return raw block data', () => {
			const rawBlock = {
				b_version: 0,
				b_totalAmount: 0,
				b_totalFee: 0,
				b_reward: 0,
				b_payloadHash:
					'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
				b_timestamp: 41898490,
				b_numberOfTransactions: 0,
				b_payloadLength: 0,
				b_previousBlock: '1087874036928524397',
				b_generatorPublicKey:
					'1cc68fa0b12521158e09779fd5978ccc0ac26bf99320e00a9549b542dd9ada16',
				b_transactions: [],
				b_blockSignature:
					'8a727cc77864b6fc81755a1f4eb4796b68f4a943d69c74a043b5ca422f3b05608a22da4a916ca7b721d096129938b6eb3381d75f1a116484d1ce2be4904d9a0e',
				b_height: 69,
				b_id: '3920300554926889269',
				b_relays: 1,
				b_confirmations: 0,
			};

			return expect(block.dbRead(rawBlock)).to.contain.keys(
				'id',
				'version',
				'timestamp',
				'height',
				'previousBlock',
				'numberOfTransactions',
				'totalAmount',
				'totalFee',
				'reward',
				'payloadLength',
				'payloadHash',
				'generatorPublicKey',
				'generatorId',
				'blockSignature',
				'confirmations',
				'totalForged'
			);
		});
	});
});
