/* eslint-disable mocha/no-pending-tests, mocha/no-skipped-tests */
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

var async = require('async');
var rewire = require('rewire');
var transactionTypes = require('../../../helpers/transaction_types.js');
var modulesLoader = require('../../common/modules_loader');
var AccountLogic = require('../../../logic/account.js');
var TransactionLogic = require('../../../logic/transaction.js');
var DelegateModule = require('../../../modules/delegates.js');
var AccountModule = require('../../../modules/accounts.js');
var LoaderModule = require('../../../modules/loader.js');
var VoteLogic = require('../../../logic/vote.js');
var TransferLogic = require('../../../logic/transfer.js');
var DelegateLogic = require('../../../logic/delegate.js');
var SignatureLogic = require('../../../logic/signature.js');
var MultisignatureLogic = require('../../../logic/multisignature.js');
var DappLogic = require('../../../logic/dapp.js');
var InTransferLogic = require('../../../logic/in_transfer.js');
var OutTransferLogic = require('../../../logic/out_transfer.js');

var TransactionModule = rewire('../../../modules/transactions.js');

describe('transactions', () => {
	var transactionsModule;
	var cacheModule;
	var dbStub;
	var TransactionTypeMap = {};
	TransactionTypeMap[transactionTypes.SEND] = 'getTransferByIds';
	TransactionTypeMap[transactionTypes.SIGNATURE] = 'getSignatureByIds';
	TransactionTypeMap[transactionTypes.DELEGATE] = 'getDelegateByIds';
	TransactionTypeMap[transactionTypes.VOTE] = 'getVotesByIds';
	TransactionTypeMap[transactionTypes.MULTI] = 'getMultiByIds';
	TransactionTypeMap[transactionTypes.DAPP] = 'getDappByIds';
	TransactionTypeMap[transactionTypes.IN_TRANSFER] = 'getInTransferByIds';
	TransactionTypeMap[transactionTypes.OUT_TRANSFER] = 'getOutTransferByIds';

	function attachAllAssets(
		transactionLogic,
		accountLogic,
		delegatesModule,
		accountsModule
	) {
		var sendLogic = transactionLogic.attachAssetType(
			transactionTypes.SEND,
			new TransferLogic()
		);
		sendLogic.bind(accountsModule);
		expect(sendLogic).to.be.an.instanceof(TransferLogic);

		var voteLogic = transactionLogic.attachAssetType(
			transactionTypes.VOTE,
			new VoteLogic(modulesLoader.logger, modulesLoader.scope.schema)
		);
		voteLogic.bind(delegatesModule);
		expect(voteLogic).to.be.an.instanceof(VoteLogic);

		var delegateLogic = transactionLogic.attachAssetType(
			transactionTypes.DELEGATE,
			new DelegateLogic(modulesLoader.scope.schema)
		);
		delegateLogic.bind(accountsModule);
		expect(delegateLogic).to.be.an.instanceof(DelegateLogic);

		var signatureLogic = transactionLogic.attachAssetType(
			transactionTypes.SIGNATURE,
			new SignatureLogic(modulesLoader.logger, modulesLoader.scope.schema)
		);
		signatureLogic.bind(accountsModule);
		expect(signatureLogic).to.be.an.instanceof(SignatureLogic);

		var multiLogic = transactionLogic.attachAssetType(
			transactionTypes.MULTI,
			new MultisignatureLogic(
				modulesLoader.scope.schema,
				modulesLoader.scope.network,
				transactionLogic,
				accountLogic,
				modulesLoader.logger
			)
		);
		multiLogic.bind(accountsModule);
		expect(multiLogic).to.be.an.instanceof(MultisignatureLogic);

		var dappLogic = transactionLogic.attachAssetType(
			transactionTypes.DAPP,
			new DappLogic(
				modulesLoader.db,
				modulesLoader.logger,
				modulesLoader.scope.schema,
				modulesLoader.scope.network
			)
		);
		expect(dappLogic).to.be.an.instanceof(DappLogic);

		var inTransferLogic = transactionLogic.attachAssetType(
			transactionTypes.IN_TRANSFER,
			new InTransferLogic(modulesLoader.db, modulesLoader.scope.schema)
		);
		inTransferLogic.bind(accountsModule, /* sharedApi */ null);
		expect(inTransferLogic).to.be.an.instanceof(InTransferLogic);

		var outTransfer = transactionLogic.attachAssetType(
			transactionTypes.OUT_TRANSFER,
			new OutTransferLogic(
				modulesLoader.db,
				modulesLoader.scope.schema,
				modulesLoader.logger
			)
		);
		outTransfer.bind(accountsModule, /* sharedApi */ null);
		expect(outTransfer).to.be.an.instanceof(OutTransferLogic);
		return transactionLogic;
	}

	before(done => {
		dbStub = {
			transactions: {
				sortFields: [
					'id',
					'blockId',
					'amount',
					'fee',
					'type',
					'timestamp',
					'senderPublicKey',
					'senderId',
					'recipientId',
					'confirmations',
					'height',
				],
				countList: null,
				list: null,
				count: null,
			},
		};

		async.auto(
			{
				accountLogic(cb) {
					modulesLoader.initLogic(AccountLogic, { db: dbStub }, cb);
				},
				cacheModule(cb) {
					modulesLoader.initCache(cb);
				},
				transactionLogic: [
					'accountLogic',
					function(result, cb) {
						modulesLoader.initLogic(
							TransactionLogic,
							{
								account: result.accountLogic,
								db: dbStub,
							},
							cb
						);
					},
				],
				loaderModule: [
					'transactionLogic',
					'accountLogic',
					function(result, cb) {
						modulesLoader.initModule(
							LoaderModule,
							{
								logic: {
									transaction: result.transactionLogic,
									account: result.accountLogic,
								},
								db: dbStub,
								config: {
									loading: {
										snapshot: false,
									},
									syncing: {
										active: true,
									},
								},
							},
							cb
						);
					},
				],
				delegateModule: [
					'transactionLogic',
					function(result, cb) {
						modulesLoader.initModule(
							DelegateModule,
							{
								logic: {
									transaction: result.transactionLogic,
								},
								db: dbStub,
							},
							cb
						);
					},
				],
				accountsModule: [
					'accountLogic',
					'transactionLogic',
					function(result, cb) {
						modulesLoader.initModule(
							AccountModule,
							{
								logic: {
									account: result.accountLogic,
									transaction: result.transactionLogic,
								},
								db: dbStub,
							},
							cb
						);
					},
				],
			},
			(err, result) => {
				expect(err).to.not.exist;

				cacheModule = result.cacheModule;

				modulesLoader.initModule(
					TransactionModule,
					{ db: dbStub, logic: { transaction: result.transactionLogic } },
					(err, __transactionModule) => {
						expect(err).to.not.exist;

						transactionsModule = __transactionModule;

						result.accountsModule.onBind({
							delegates: result.delegateModule,
							accounts: result.accountsModule,
							transactions: transactionsModule,
						});

						result.delegateModule.onBind({
							accounts: result.accountsModule,
							transactions: transactionsModule,
						});

						__transactionModule.onBind({
							accounts: result.accountsModule,
							loader: result.loaderModule,
							cache: result.cacheModule,
						});

						attachAllAssets(
							result.transactionLogic,
							result.accountLogic,
							result.delegateModule,
							result.accountsModule
						);
						done();
					}
				);
			}
		);
	});

	beforeEach(() => {
		dbStub.transactions.countList = sinonSandbox.stub().resolves();
		dbStub.transactions.list = sinonSandbox.stub().resolves();
		dbStub.transactions.count = sinonSandbox.stub().resolves();

		return Object.keys(TransactionTypeMap).forEach(key => {
			dbStub.transactions[
				TransactionTypeMap[key]
			] = sinonSandbox.stub().resolves();
		});
	});

	afterEach(() => {
		return sinonSandbox.restore();
	});

	describe('Transaction#shared', () => {
		describe('getTransaction', () => {
			function getTransactionsById(id, done) {
				transactionsModule.shared.getTransactions({ id }, done);
			}

			var transactionsByType = {
				0: {
					transaction: {
						id: '10707276464897629547',
						height: 276,
						blockId: '10342884759015889572',
						type: 0,
						timestamp: 40080841,
						senderPublicKey:
							'ac81bb5fa789776e26120202e0c996eae6c1987055a1d837db3dc0f621ceeb66',
						requesterPublicKey: undefined,
						senderId: '2525786814299543383L',
						recipientId: '16313739661670634666L',
						recipientPublicKey:
							'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
						amount: '112340000',
						fee: '20000000',
						signature:
							'56a09d33ca4d19d9092ad764952d3c43fa575057b1078fc64875fcb50a1b1755230affc4665ff6a2de2671a5106cf0ae2d709e4f6e59d21c5cdc22f77060c506',
						signSignature: undefined,
						signatures: [],
						confirmations: 12,
						asset: {
							data: 'extra information',
						},
					},
					transactionId: '10707276464897629547',
				},
				1: {
					transaction: {
						id: '11286126025791281057',
						height: 276,
						blockId: '10342884759015889572',
						type: 1,
						timestamp: 40080841,
						senderPublicKey:
							'f6b8bd8e0643921d90d935cbcf0eae7cd2271e77aceac35e75c9ed9d4e222237',
						senderId: '10313008732729972965L',
						recipientId: null,
						recipientPublicKey: null,
						amount: '0',
						fee: '500000000',
						signature:
							'b281931b24514c0b150a3b6daf362822c98207148c8967b2469233c5118f7874520e4067595f20c359136385fc8c0ba9391b408df139f58ba86a279b9d96b305',
						signatures: [],
						confirmations: 59,
						asset: {
							signature: {
								transactionId: '11286126025791281057',
								publicKey:
									'e26ede27ed390a9da260b5f5b76db5908a164044d3d1f9d2b24116dd5b25dc72',
							},
						},
					},
					transactionId: '11286126025791281057',
				},
				2: {
					transaction: {
						id: '6092156606242987573',
						height: 371,
						blockId: '17233974955873751907',
						type: 2,
						timestamp: 40081792,
						senderPublicKey:
							'81fc017321367f5ebfd75c9b115c321ca8dbbaaf6c794feeefa0bd70f364f98d',
						requesterPublicKey: undefined,
						senderId: '13683056641259213857L',
						recipientId: null,
						recipientPublicKey: null,
						amount: '0',
						fee: '2500000000',
						signature:
							'00732b1bc95d8b459bde261cbdd27c7e06bb023483446f350101f42bdd2f5d807be0115ea5ef9f3e15246659a8d3d14cbae5afe5ad2862a3416ddee29870b009',
						signSignature: undefined,
						signatures: [],
						confirmations: 13,
						asset: {
							delegate: {
								username: '&im',
								publicKey:
									'81fc017321367f5ebfd75c9b115c321ca8dbbaaf6c794feeefa0bd70f364f98d',
								address: '13683056641259213857L',
							},
						},
					},
					transactionId: '6092156606242987573',
				},
				3: {
					transaction: {
						id: '6820432253266933365',
						height: 371,
						blockId: '17233974955873751907',
						type: 3,
						timestamp: 40081792,
						senderPublicKey:
							'31ab15b507bbdbb8f53b0dfbca65e78aafc3efe73e793b5f7db94dae53f94aba',
						requesterPublicKey: undefined,
						senderId: '8643584619166983815L',
						recipientId: '8643584619166983815L',
						recipientPublicKey:
							'31ab15b507bbdbb8f53b0dfbca65e78aafc3efe73e793b5f7db94dae53f94aba',
						amount: '0',
						fee: '100000000',
						signature:
							'02dacc2888e1c4608e812d7099a2657e6f57f1446af6489811a942621f5619292873429621c097078276047a5905bb8e11af5ad5a96a389b767e6c7c019f6c0b',
						signSignature: undefined,
						signatures: [],
						confirmations: 40,
						asset: {
							votes: [
								'+9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
								'+141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a',
							],
						},
					},
					transactionId: '6820432253266933365',
				},
				4: {
					transaction: {
						id: '481620703379194749',
						height: 371,
						blockId: '17233974955873751907',
						type: 4,
						timestamp: 40081792,
						senderPublicKey:
							'aae5e1ccc5f30e1983aaf38867ce6f33acbee116a396ae5249ea6495fdc9bcf7',
						senderId: '10952279861355607751L',
						recipientId: null,
						recipientPublicKey: null,
						amount: '0',
						fee: '1500000000',
						signature:
							'c05e4fe662f64c14529331d37611ccfc66f41901f92faa6c7c010f7a2f6fcda9c594aa67c5634f46b795d9dc0cb75943c6a20f757e56f86e88205876ae17b103',
						signatures: [
							'fa67d933ca29f6c476b02e5f0057fe8ecdae4a15d06acd6df515389c7e1d989f20e931c51483632059d4173fc69e472ef889e06e05a73ec48b7cea887ae4da0f',
							'83946b53e06e89eeb76a667c8607bcb93cee2c63932040eb49f78a1eb7480071f5c9e89e3bbf96f63cd31b664baa489c2765b81376c793daace7573566611900',
						],
						confirmations: 65,
						asset: {
							multisignature: {
								min: 2,
								lifetime: 1,
								keysgroup: [
									'+f497c0187575ca25d01e4afc454b04be71a4f3a45c48b86e6e86c71fdeecb4f4',
									'+cbc6f7f616035cbc5d21c398735d5dc1baf68eec7f4671fba2390b34eb4fd854',
								],
							},
						},
					},
					transactionId: '481620703379194749',
				},
				5: {
					transaction: {
						id: '1907088915785679339',
						height: 371,
						blockId: '17233974955873751907',
						type: 5,
						timestamp: 40081792,
						senderPublicKey:
							'644485a01cb11e06a1f4ffef90a7ba251e56d54eb06a0cb2ecb5693a8cc163a2',
						senderId: '5519106118231224961L',
						recipientId: null,
						recipientPublicKey: null,
						amount: '0',
						fee: '2500000000',
						signature:
							'b024f90f73e53c9fee943f3c3ef7a9e3da99bab2f9fa3cbfd5ad05ed79cdbbe21130eb7b27698692bf491a1cf573a518dfa63607dc88bc0c01925fda18304905',
						signatures: [],
						confirmations: 97,
						asset: {
							dapp: {
								name: 'AO7ezB11CgCdUZi5o8YzxCAtoRLA6Fi',
								description: null,
								tags: null,
								type: 1,
								link: 'http://www.lisk.io/AO7ezB11CgCdUZi5o8YzxCAtoRLA6Fi.zip',
								category: 2,
								icon: null,
							},
						},
					},
					transactionId: '1907088915785679339',
				},
			};

			it('should get transaction for send transaction id', done => {
				var transactionId =
					transactionsByType[transactionTypes.SEND].transactionId;
				var transaction = transactionsByType[transactionTypes.SEND].transaction;

				dbStub.transactions.countList.onCall(0).resolves(1);

				dbStub.transactions.list.onCall(0).resolves([
					{
						t_id: '10707276464897629547',
						b_height: 276,
						t_blockId: '10342884759015889572',
						t_type: 0,
						t_timestamp: 40080841,
						t_senderPublicKey:
							'ac81bb5fa789776e26120202e0c996eae6c1987055a1d837db3dc0f621ceeb66',
						m_recipientPublicKey:
							'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
						t_senderId: '2525786814299543383L',
						t_recipientId: '16313739661670634666L',
						t_amount: '112340000',
						t_fee: '20000000',
						t_signature:
							'56a09d33ca4d19d9092ad764952d3c43fa575057b1078fc64875fcb50a1b1755230affc4665ff6a2de2671a5106cf0ae2d709e4f6e59d21c5cdc22f77060c506',
						t_SignSignature: null,
						t_signatures: null,
						confirmations: 12,
					},
				]);

				dbStub.transactions[TransactionTypeMap[transactionTypes.SEND]]
					.onCall(0)
					.resolves([
						{
							transaction_id: '10707276464897629547',
							tf_data: 'extra information',
						},
					]);

				getTransactionsById(transactionId, (err, res) => {
					expect(err).to.not.exist;
					expect(res)
						.to.have.property('transactions')
						.which.is.an('Array');
					expect(res.transactions[0].type).to.equal(transaction.type);
					expect(res.transactions[0].amount.isEqualTo(transaction.amount)).to.be
						.true;
					expect(res.transactions[0].fee.isEqualTo(transaction.fee)).to.be.true;
					expect(res.transactions[0].recipientId).to.equal(
						transaction.recipientId
					);
					expect(res.transactions[0].timestamp).to.equal(transaction.timestamp);
					expect(res.transactions[0].asset).to.eql(transaction.asset);
					expect(res.transactions[0].senderPublicKey).to.equal(
						transaction.senderPublicKey
					);
					expect(res.transactions[0].signature).to.equal(transaction.signature);
					expect(res.transactions[0].id).to.equal(transaction.id);
					expect(res.transactions[0].type).to.equal(transaction.type);
					expect(res.transactions[0].type).to.equal(transactionTypes.SEND);
					done();
				});
			});

			it('should get transaction with singature asset for transaction id', done => {
				var transactionId =
					transactionsByType[transactionTypes.SIGNATURE].transactionId;
				var transaction =
					transactionsByType[transactionTypes.SIGNATURE].transaction;

				dbStub.transactions.countList.onCall(0).resolves(1);

				dbStub.transactions.list.onCall(0).resolves([
					{
						t_id: '11286126025791281057',
						b_height: 276,
						t_blockId: '10342884759015889572',
						t_type: 1,
						t_timestamp: 40080841,
						t_senderPublicKey:
							'f6b8bd8e0643921d90d935cbcf0eae7cd2271e77aceac35e75c9ed9d4e222237',
						m_recipientPublicKey: null,
						t_senderId: '10313008732729972965L',
						t_recipientId: null,
						t_amount: '0',
						t_fee: '500000000',
						t_signature:
							'b281931b24514c0b150a3b6daf362822c98207148c8967b2469233c5118f7874520e4067595f20c359136385fc8c0ba9391b408df139f58ba86a279b9d96b305',
						t_SignSignature: null,
						t_signatures: null,
						confirmations: 42,
					},
				]);

				dbStub.transactions[TransactionTypeMap[transactionTypes.SIGNATURE]]
					.onCall(0)
					.resolves([
						{
							transaction_id: '11286126025791281057',
							s_publicKey:
								'e26ede27ed390a9da260b5f5b76db5908a164044d3d1f9d2b24116dd5b25dc72',
						},
					]);

				getTransactionsById(transactionId, (err, res) => {
					expect(err).to.not.exist;
					expect(res)
						.to.have.property('transactions')
						.which.is.an('array');
					expect(res.transactions[0].id).to.equal(transaction.id);
					expect(res.transactions[0].amount.isEqualTo(transaction.amount)).to.be
						.true;
					expect(res.transactions[0].asset.signature.publicKey).to.equal(
						transaction.asset.signature.publicKey
					);
					expect(res.transactions[0].fee.isEqualTo(transaction.fee)).to.be.true;
					expect(res.transactions[0].type).to.equal(transaction.type);
					expect(res.transactions[0].type).to.equal(transactionTypes.SIGNATURE);
					done();
				});
			});

			it('should get transaction with delegate asset for transaction id', done => {
				var transactionId =
					transactionsByType[transactionTypes.DELEGATE].transactionId;
				var transaction =
					transactionsByType[transactionTypes.DELEGATE].transaction;

				dbStub.transactions.countList.onCall(0).resolves(1);

				dbStub.transactions.list.onCall(0).resolves([
					{
						t_id: '6092156606242987573',
						b_height: 371,
						t_blockId: '17233974955873751907',
						t_type: 2,
						t_timestamp: 40081792,
						t_senderPublicKey:
							'81fc017321367f5ebfd75c9b115c321ca8dbbaaf6c794feeefa0bd70f364f98d',
						m_recipientPublicKey: null,
						t_senderId: '13683056641259213857L',
						t_recipientId: null,
						t_amount: '0',
						t_fee: '2500000000',
						t_signature:
							'00732b1bc95d8b459bde261cbdd27c7e06bb023483446f350101f42bdd2f5d807be0115ea5ef9f3e15246659a8d3d14cbae5afe5ad2862a3416ddee29870b009',
						t_SignSignature: null,
						t_signatures: null,
						confirmations: 13,
					},
				]);

				dbStub.transactions[TransactionTypeMap[transactionTypes.DELEGATE]]
					.onCall(0)
					.resolves([
						{
							transaction_id: '6092156606242987573',
							d_username: '&im',
						},
					]);

				getTransactionsById(transactionId, (err, res) => {
					expect(err).to.not.exist;
					expect(res)
						.to.have.property('transactions')
						.which.is.an('array');
					expect(res.transactions[0].id).to.equal(transaction.id);
					expect(res.transactions[0].amount.isEqualTo(transaction.amount)).to.be
						.true;
					expect(res.transactions[0].asset.username).to.equal(
						transaction.asset.username
					);
					expect(res.transactions[0].asset.publicKey).to.equal(
						transaction.asset.publicKey
					);
					expect(res.transactions[0].asset.address).to.equal(
						transaction.asset.address
					);
					expect(res.transactions[0].fee.isEqualTo(transaction.fee)).to.be.true;
					expect(res.transactions[0].type).to.equal(transaction.type);
					expect(res.transactions[0].type).to.equal(transactionTypes.DELEGATE);
					done();
				});
			});

			it('should get transaction with vote asset for transaction id', done => {
				var transactionId =
					transactionsByType[transactionTypes.VOTE].transactionId;
				var transaction = transactionsByType[transactionTypes.VOTE].transaction;

				dbStub.transactions.countList.onCall(0).resolves(1);

				dbStub.transactions.list.onCall(0).resolves([
					{
						t_id: '6820432253266933365',
						b_height: 371,
						t_blockId: '17233974955873751907',
						t_type: 3,
						t_timestamp: 40081792,
						t_senderPublicKey:
							'31ab15b507bbdbb8f53b0dfbca65e78aafc3efe73e793b5f7db94dae53f94aba',
						m_recipientPublicKey:
							'31ab15b507bbdbb8f53b0dfbca65e78aafc3efe73e793b5f7db94dae53f94aba',
						t_senderId: '8643584619166983815L',
						t_recipientId: '8643584619166983815L',
						t_amount: '0',
						t_fee: '100000000',
						t_signature:
							'02dacc2888e1c4608e812d7099a2657e6f57f1446af6489811a942621f5619292873429621c097078276047a5905bb8e11af5ad5a96a389b767e6c7c019f6c0b',
						t_SignSignature: null,
						t_signatures: null,
						confirmations: 40,
					},
				]);

				dbStub.transactions[TransactionTypeMap[transactionTypes.VOTE]]
					.onCall(0)
					.resolves([
						{
							transaction_id: '6820432253266933365',
							v_votes:
								'+9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f,+141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a',
						},
					]);

				getTransactionsById(transactionId, (err, res) => {
					expect(err).to.not.exist;
					expect(res)
						.to.have.property('transactions')
						.which.is.an('array');
					expect(res.transactions[0].id).to.equal(transaction.id);
					expect(res.transactions[0].amount.isEqualTo(transaction.amount)).to.be
						.true;
					expect(res.transactions[0].asset.votes).to.eql(
						transaction.asset.votes
					);
					expect(res.transactions[0].fee.isEqualTo(transaction.fee)).to.be.true;
					expect(res.transactions[0].type).to.equal(transaction.type);
					expect(res.transactions[0].type).to.equal(transactionTypes.VOTE);
					done();
				});
			});

			it('should get transaction with MULTI asset for transaction id', done => {
				var transactionId =
					transactionsByType[transactionTypes.MULTI].transactionId;
				var transaction =
					transactionsByType[transactionTypes.MULTI].transaction;

				dbStub.transactions.countList.onCall(0).resolves(1);

				dbStub.transactions.list.onCall(0).resolves([
					{
						t_id: '481620703379194749',
						b_height: 371,
						t_blockId: '17233974955873751907',
						t_type: 4,
						t_timestamp: 40081792,
						t_senderPublicKey:
							'aae5e1ccc5f30e1983aaf38867ce6f33acbee116a396ae5249ea6495fdc9bcf7',
						m_recipientPublicKey: null,
						t_senderId: '10952279861355607751L',
						t_recipientId: null,
						t_amount: '0',
						t_fee: '1500000000',
						t_signature:
							'c05e4fe662f64c14529331d37611ccfc66f41901f92faa6c7c010f7a2f6fcda9c594aa67c5634f46b795d9dc0cb75943c6a20f757e56f86e88205876ae17b103',
						t_SignSignature: null,
						t_signatures:
							'fa67d933ca29f6c476b02e5f0057fe8ecdae4a15d06acd6df515389c7e1d989f20e931c51483632059d4173fc69e472ef889e06e05a73ec48b7cea887ae4da0f,83946b53e06e89eeb76a667c8607bcb93cee2c63932040eb49f78a1eb7480071f5c9e89e3bbf96f63cd31b664baa489c2765b81376c793daace7573566611900',
						confirmations: 65,
					},
				]);

				dbStub.transactions[TransactionTypeMap[transactionTypes.MULTI]]
					.onCall(0)
					.resolves([
						{
							transaction_id: '481620703379194749',
							m_min: 2,
							m_lifetime: 1,
							m_keysgroup:
								'+f497c0187575ca25d01e4afc454b04be71a4f3a45c48b86e6e86c71fdeecb4f4,+cbc6f7f616035cbc5d21c398735d5dc1baf68eec7f4671fba2390b34eb4fd854',
						},
					]);

				getTransactionsById(transactionId, (err, res) => {
					expect(err).to.not.exist;
					expect(res)
						.to.have.property('transactions')
						.which.is.an('array');
					expect(res.transactions[0].id).to.equal(transaction.id);
					expect(res.transactions[0].amount.isEqualTo(transaction.amount)).to.be
						.true;
					expect(res.transactions[0].asset.multisignature.lifetime).to.equal(
						transaction.asset.multisignature.lifetime
					);
					expect(res.transactions[0].asset.multisignature.min).to.equal(
						transaction.asset.multisignature.min
					);
					expect(res.transactions[0].asset.multisignature.keysgroup).to.eql(
						transaction.asset.multisignature.keysgroup
					);
					expect(res.transactions[0].fee.isEqualTo(transaction.fee)).to.be.true;
					expect(res.transactions[0].type).to.equal(transaction.type);
					expect(res.transactions[0].type).to.equal(transactionTypes.MULTI);
					done();
				});
			});

			it('should get transaction with DAPP asset for transaction id', done => {
				var transactionId =
					transactionsByType[transactionTypes.DAPP].transactionId;
				var transaction = transactionsByType[transactionTypes.DAPP].transaction;

				dbStub.transactions.countList.onCall(0).resolves(1);

				dbStub.transactions.list.onCall(0).resolves([
					{
						t_id: '1907088915785679339',
						b_height: 371,
						t_blockId: '17233974955873751907',
						t_type: 5,
						t_timestamp: 40081792,
						t_senderPublicKey:
							'644485a01cb11e06a1f4ffef90a7ba251e56d54eb06a0cb2ecb5693a8cc163a2',
						m_recipientPublicKey: null,
						t_senderId: '5519106118231224961L',
						t_recipientId: null,
						t_amount: '0',
						t_fee: '2500000000',
						t_signature:
							'b024f90f73e53c9fee943f3c3ef7a9e3da99bab2f9fa3cbfd5ad05ed79cdbbe21130eb7b27698692bf491a1cf573a518dfa63607dc88bc0c01925fda18304905',
						t_SignSignature: null,
						t_signatures: null,
						confirmations: 97,
					},
				]);

				dbStub.transactions[TransactionTypeMap[transactionTypes.DAPP]]
					.onCall(0)
					.resolves([
						{
							transaction_id: '1907088915785679339',
							dapp_name: 'AO7ezB11CgCdUZi5o8YzxCAtoRLA6Fi',
							dapp_description: null,
							dapp_tags: null,
							dapp_link:
								'http://www.lisk.io/AO7ezB11CgCdUZi5o8YzxCAtoRLA6Fi.zip',
							dapp_type: 1,
							dapp_category: 2,
							dapp_icon: null,
						},
					]);

				getTransactionsById(transactionId, (err, res) => {
					expect(err).to.not.exist;
					expect(res)
						.to.have.property('transactions')
						.which.is.an('array');
					expect(res.transactions[0].id).to.equal(transaction.id);
					expect(res.transactions[0].amount.isEqualTo(transaction.amount)).to.be
						.true;
					expect(res.transactions[0].fee.isEqualTo(transaction.fee)).to.be.true;
					expect(res.transactions[0].type).to.equal(transaction.type);
					expect(res.transactions[0].asset.dapp.name).to.equal(
						transaction.asset.dapp.name
					);
					expect(res.transactions[0].asset.dapp.category).to.equal(
						transaction.asset.dapp.category
					);
					expect(res.transactions[0].asset.dapp.link).to.equal(
						transaction.asset.dapp.link
					);
					expect(res.transactions[0].asset.dapp.type).to.equal(
						transaction.asset.dapp.type
					);
					expect(res.transactions[0].type).to.equal(transactionTypes.DAPP);
					done();
				});
			});

			it.skip('should get transaction with intransfer asset for transaction id', done => {
				var transactionId =
					transactionsByType[transactionTypes.IN_TRANSFER].transactionId;
				var transaction =
					transactionsByType[transactionTypes.IN_TRANSFER].transaction;

				getTransactionsById(transactionId, (err, res) => {
					expect(err).to.not.exist;
					expect(res)
						.to.have.property('transactions')
						.which.is.an('array');
					expect(res.transactions[0].id).to.equal(transaction.id);
					expect(res.transactions[0].amount.isEqualTo(transaction.amount)).to.be
						.true;
					expect(res.transactions[0].fee.isEqualTo(transaction.fee)).to.be.true;
					expect(res.transactions[0].type).to.equal(transaction.type);
					expect(res.transactions[0].asset.inTransfer.dappId).to.equal(
						transaction.asset.inTransfer.dappId
					);
					expect(res.transactions[0].type).to.equal(
						transactionTypes.IN_TRANSFER
					);
					done();
				});
			});

			it('should get transaction with outtransfer asset for transaction id');
		});

		describe('getTransactionsCount', () => {
			beforeEach(() => {
				sinonSandbox.spy(async, 'waterfall');
				return dbStub.transactions.count.onCall(0).resolves(10);
			});

			const expectValidCountResponse = data => {
				expect(data).to.have.keys(
					'total',
					'confirmed',
					'unconfirmed',
					'unprocessed',
					'unsigned'
				);
				expect(data.total).to.be.a('number');
				expect(data.confirmed).to.be.a('number');
				expect(data.unconfirmed).to.be.a('number');
				expect(data.unprocessed).to.be.a('number');
				expect(data.unsigned).to.be.a('number');
				expect(data.total).to.be.eql(
					data.confirmed + data.unconfirmed + data.unprocessed + data.unsigned
				);
			};

			it('should return transaction count in correct format', done => {
				transactionsModule.shared.getTransactionsCount((err, data) => {
					expect(err).to.be.null;
					expectValidCountResponse(data);

					done();
				});
			});

			it('should try to get transaction count from cache first', done => {
				sinonSandbox.spy(cacheModule, 'getJsonForKey');

				transactionsModule.shared.getTransactionsCount((err, data) => {
					expect(err).to.be.null;
					expectValidCountResponse(data);

					expect(async.waterfall).to.be.calledOnce;
					expect(cacheModule.getJsonForKey).to.be.calledOnce;
					expect(cacheModule.getJsonForKey.firstCall.args[0]).to.be.eql(
						cacheModule.KEYS.transactionCount
					);

					done();
				});
			});

			it('should use cached transaction count if found', done => {
				sinonSandbox
					.stub(cacheModule, 'getJsonForKey')
					.callsArgWith(1, null, { confirmed: 999 });

				transactionsModule.shared.getTransactionsCount((err, data) => {
					expect(err).to.be.null;
					expectValidCountResponse(data);

					expect(async.waterfall).to.be.calledOnce;
					expect(cacheModule.getJsonForKey).to.be.calledOnce;
					expect(cacheModule.getJsonForKey.firstCall.args[0]).to.be.eql(
						cacheModule.KEYS.transactionCount
					);
					expect(dbStub.transactions.count).to.be.not.calledOnce;

					expect(data.confirmed).to.be.eql(999);

					done();
				});
			});

			it('should get transaction count from db if cache fails', done => {
				sinonSandbox
					.stub(cacheModule, 'getJsonForKey')
					.callsArgWith(1, new Error('Cache error'));

				transactionsModule.shared.getTransactionsCount((err, data) => {
					expect(err).to.be.null;
					expectValidCountResponse(data);

					expect(async.waterfall).to.be.calledOnce;
					expect(cacheModule.getJsonForKey).to.be.calledOnce;
					expect(cacheModule.getJsonForKey.firstCall.args[0]).to.be.eql(
						cacheModule.KEYS.transactionCount
					);
					expect(dbStub.transactions.count).to.be.calledOnce;
					expect(data.confirmed).to.be.eql(10);

					done();
				});
			});

			it('should get transaction count from db if no cache exists', done => {
				sinonSandbox
					.stub(cacheModule, 'getJsonForKey')
					.callsArgWith(1, null, null);

				transactionsModule.shared.getTransactionsCount((err, data) => {
					expect(err).to.be.null;
					expectValidCountResponse(data);

					expect(async.waterfall).to.be.calledOnce;
					expect(cacheModule.getJsonForKey).to.be.calledOnce;
					expect(cacheModule.getJsonForKey.firstCall.args[0]).to.be.eql(
						cacheModule.KEYS.transactionCount
					);
					expect(dbStub.transactions.count).to.be.calledOnce;
					expect(data.confirmed).to.be.eql(10);
					done();
				});
			});

			it('should update the transaction count in cache if not already persisted', done => {
				sinonSandbox
					.stub(cacheModule, 'getJsonForKey')
					.callsArgWith(1, null, null);
				sinonSandbox.spy(cacheModule, 'setJsonForKey');

				transactionsModule.shared.getTransactionsCount((err, data) => {
					expect(err).to.be.null;
					expectValidCountResponse(data);

					expect(async.waterfall).to.be.calledOnce;
					expect(cacheModule.getJsonForKey).to.be.calledOnce;
					expect(cacheModule.getJsonForKey.firstCall.args[0]).to.be.eql(
						cacheModule.KEYS.transactionCount
					);
					expect(data.confirmed).to.be.eql(10);
					expect(dbStub.transactions.count).to.be.calledOnce;

					expect(cacheModule.setJsonForKey).to.be.calledOnce;
					expect(cacheModule.setJsonForKey.firstCall.args[0]).to.be.eql(
						cacheModule.KEYS.transactionCount
					);
					expect(cacheModule.setJsonForKey.firstCall.args[1]).to.be.eql({
						confirmed: 10,
					});

					done();
				});
			});

			it('should skip updating transaction count cache if already persisted', done => {
				sinonSandbox
					.stub(cacheModule, 'getJsonForKey')
					.callsArgWith(1, null, { confirmed: 999 });
				sinonSandbox.spy(cacheModule, 'setJsonForKey');

				transactionsModule.shared.getTransactionsCount((err, data) => {
					expect(err).to.be.null;
					expectValidCountResponse(data);

					expect(async.waterfall).to.be.calledOnce;
					expect(cacheModule.getJsonForKey).to.be.calledOnce;
					expect(cacheModule.getJsonForKey.firstCall.args[0]).to.be.eql(
						cacheModule.KEYS.transactionCount
					);
					expect(data.confirmed).to.be.eql(999);
					expect(dbStub.transactions.count).to.not.be.called;

					expect(cacheModule.setJsonForKey).to.be.not.called;

					done();
				});
			});
		});
	});
});
