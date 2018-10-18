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

var crypto = require('crypto');
var randomstring = require('randomstring');
var accountFixtures = require('../../fixtures/accounts');
var modulesLoader = require('../../common/modules_loader');
var application = require('../../common/application');
var transactionTypes = require('../../../helpers/transaction_types');
var ed = require('../../../helpers/ed');
var Bignum = require('../../../helpers/bignum.js');
var Transfer = require('../../../logic/transfer');

const { FEES, ADDITIONAL_DATA } = __testContext.config.constants;
var validPassphrase =
	'robust weapon course unknown head trial pencil latin acid';
var validKeypair = ed.makeKeypair(
	crypto
		.createHash('sha256')
		.update(validPassphrase, 'utf8')
		.digest()
);

var senderHash = crypto
	.createHash('sha256')
	.update(accountFixtures.genesis.passphrase, 'utf8')
	.digest();
var senderKeypair = ed.makeKeypair(senderHash);

var validSender = {
	username: null,
	isDelegate: 0,
	secondSignature: 0,
	address: '16313739661670634666L',
	publicKey: 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	secondPublicKey: null,
	balance: '9850458911801508',
	u_balance: '9850458911801508',
	vote: 0,
	multisignatures: null,
	multimin: 0,
	multilifetime: 0,
	blockId: '8505659485551877884',
	nameexist: 0,
	producedBlocks: 0,
	missedBlocks: 0,
	fees: '0',
	rewards: '0',
};

var validTransaction = {
	id: '16140284222734558289',
	rowId: 133,
	blockId: '1462190441827192029',
	type: 0,
	timestamp: 33363661,
	senderPublicKey:
		'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	senderId: '16313739661670634666L',
	recipientId: '2460251951231579923L',
	amount: '8067474861277',
	fee: '10000000',
	signature:
		'0c5e9ed74fc64ca5940a45025f7386fc40cc7f495ca48490d2c7e9fb636cbe8046e1a5ce031ff5d84f7bf753f9e4307c6c3dedcc9756844177093dd46ccade06',
	signSignature: null,
	requesterPublicKey: null,
	signatures: null,
	asset: {},
};

var rawValidTransaction = {
	t_id: '16140284222734558289',
	b_height: 981,
	t_blockId: '1462190441827192029',
	t_type: 0,
	t_timestamp: 33363661,
	t_senderPublicKey:
		'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	m_recipientPublicKey: null,
	t_senderId: '16313739661670634666L',
	t_recipientId: '2460251951231579923L',
	t_amount: '8067474861277',
	t_fee: '10000000',
	t_signature:
		'0c5e9ed74fc64ca5940a45025f7386fc40cc7f495ca48490d2c7e9fb636cbe8046e1a5ce031ff5d84f7bf753f9e4307c6c3dedcc9756844177093dd46ccade06',
	confirmations: 8343,
};

describe('transfer', () => {
	var transfer;
	var transactionLogic;
	var transferBindings;
	var accountModule;

	before(done => {
		application.init(
			{ sandbox: { name: 'lisk_test_logic_transfer' } },
			(err, scope) => {
				accountModule = scope.modules.accounts;
				transfer = new Transfer(
					modulesLoader.scope.logger,
					modulesLoader.scope.schema
				);
				transferBindings = {
					account: accountModule,
				};
				transfer.bind(accountModule);
				transactionLogic = scope.logic.transaction;
				transactionLogic.attachAssetType(transactionTypes.SEND, transfer);
				done();
			}
		);
	});

	after(done => {
		application.cleanup(done);
	});

	describe('bind', () => {
		it('should be okay with correct params', () => {
			return expect(() => {
				transfer.bind(transferBindings.account);
			}).to.not.throw();
		});

		after(() => {
			return transfer.bind(transferBindings.account);
		});
	});

	describe('calculateFee', () => {
		it('should return the correct fee for a transfer', () => {
			return expect(
				transfer.calculateFee(validTransaction).isEqualTo(new Bignum(FEES.SEND))
			).to.be.true;
		});

		it('should return the same fee for a transfer with additional data', () => {
			var transaction = _.clone(validTransaction);
			transaction.asset = {
				data: '0',
			};
			return expect(
				transfer.calculateFee
					.call(transactionLogic, transaction)
					.isEqualTo(FEES.SEND)
			).to.be.true;
		});
	});

	describe('verify', () => {
		it('should return error if recipientId is not set', done => {
			var transaction = _.cloneDeep(validTransaction);
			delete transaction.recipientId;

			transfer.verify(transaction, validSender, err => {
				expect(err).to.equal('Missing recipient');
				done();
			});
		});

		it('should return error if amount is less than 0', done => {
			var transaction = _.cloneDeep(validTransaction);
			transaction.amount = -10;

			transfer.verify(transaction, validSender, err => {
				expect(err).to.equal('Invalid transaction amount');
				done();
			});
		});

		it('should verify okay for valid transaction', done => {
			transfer.verify(validTransaction, validSender, done);
		});
	});

	describe('process', () => {
		it('should be okay', done => {
			transfer.process(validTransaction, validSender, done);
		});
	});

	describe('getBytes', () => {
		it('should return null for empty asset', () => {
			return expect(transfer.getBytes(validTransaction)).to.eql(null);
		});

		it('should return bytes of data asset', () => {
			var transaction = _.cloneDeep(validTransaction);
			var data = "1'";
			transaction.asset = {
				data,
			};

			return expect(transfer.getBytes(transaction)).to.eql(
				Buffer.from(data, 'utf8')
			);
		});

		it('should be okay for utf-8 data value', () => {
			var transaction = _.cloneDeep(validTransaction);
			var data = 'Zażółć gęślą jaźń';
			transaction.asset = {
				data,
			};

			return expect(transfer.getBytes(transaction)).to.eql(
				Buffer.from(data, 'utf8')
			);
		});
	});

	describe('applyConfirmed', () => {
		var dummyBlock = {
			id: '9314232245035524467',
			height: 1,
		};

		function undoConfirmedTransaction(transaction, sender, done) {
			transfer.undoConfirmed(transaction, dummyBlock, sender, done);
		}

		it('should return error if recipientid is not set', done => {
			var transaction = _.cloneDeep(validTransaction);
			delete transaction.recipientId;
			transfer.applyConfirmed(transaction, dummyBlock, validSender, err => {
				expect(err).to.equal('Invalid public key');
				done();
			});
		});

		it('should be okay for a valid transaction', done => {
			accountModule.getAccount(
				{ address: validTransaction.recipientId },
				(err, accountBefore) => {
					expect(err).to.not.exist;
					expect(accountBefore).to.exist;

					var amount = new Bignum(validTransaction.amount.toString());
					var balanceBefore = new Bignum(accountBefore.balance.toString());

					transfer.applyConfirmed(
						validTransaction,
						dummyBlock,
						validSender,
						err => {
							expect(err).to.not.exist;

							accountModule.getAccount(
								{ address: validTransaction.recipientId },
								(err, accountAfter) => {
									expect(err).to.not.exist;
									expect(accountAfter).to.exist;

									var balanceAfter = new Bignum(
										accountAfter.balance.toString()
									);
									expect(
										balanceBefore
											.plus(amount)
											.isEqualTo(balanceAfter.toString())
									).to.be.true;
									undoConfirmedTransaction(validTransaction, validSender, done);
								}
							);
						}
					);
				}
			);
		});
	});

	describe('undoConfirmed', () => {
		var dummyBlock = {
			id: '9314232245035524467',
			height: 1,
		};

		function applyConfirmedTransaction(transaction, sender, done) {
			transfer.applyConfirmed(transaction, dummyBlock, sender, done);
		}

		it('should return error if recipientid is not set', done => {
			var transaction = _.cloneDeep(validTransaction);
			delete transaction.recipientId;

			transfer.undoConfirmed(transaction, dummyBlock, validSender, err => {
				expect(err).to.equal('Invalid public key');
				done();
			});
		});

		it('should be okay for a valid transaction', done => {
			accountModule.getAccount(
				{ address: validTransaction.recipientId },
				(err, accountBefore) => {
					expect(err).to.not.exist;

					var amount = new Bignum(validTransaction.amount.toString());
					var balanceBefore = new Bignum(accountBefore.balance.toString());

					transfer.undoConfirmed(
						validTransaction,
						dummyBlock,
						validSender,
						err => {
							expect(err).to.not.exist;

							accountModule.getAccount(
								{ address: validTransaction.recipientId },
								(err, accountAfter) => {
									var balanceAfter = new Bignum(
										accountAfter.balance.toString()
									);

									expect(err).to.not.exist;
									expect(
										balanceAfter
											.plus(amount)
											.isEqualTo(balanceBefore.toString())
									).to.be.true;
									applyConfirmedTransaction(
										validTransaction,
										validSender,
										done
									);
								}
							);
						}
					);
				}
			);
		});
	});

	describe('applyUnconfirmed', () => {
		it('should be okay with valid params', done => {
			transfer.applyUnconfirmed(validTransaction, validSender, done);
		});
	});

	describe('undoUnconfirmed', () => {
		it('should be okay with valid params', done => {
			transfer.undoUnconfirmed(validTransaction, validSender, done);
		});
	});

	describe('objectNormalize', () => {
		it('should remove blockId from transaction', () => {
			var transaction = _.cloneDeep(validTransaction);
			transaction.blockId = '9314232245035524467';

			return expect(transfer.objectNormalize(transaction)).to.not.have.key(
				'blockId'
			);
		});

		it('should not remove data field', () => {
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset = {
				data: '123',
			};

			return expect(transfer.objectNormalize(transaction).asset).to.eql(
				transaction.asset
			);
		});

		it('should throw error if value is null', () => {
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset = {
				data: null,
			};

			return expect(() => {
				transfer.objectNormalize(transaction);
			}).to.throw(
				'Failed to validate transfer schema: Expected type string but found type null'
			);
		});

		it('should throw error if value is undefined', () => {
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset = {
				data: undefined,
			};

			return expect(() => {
				transfer.objectNormalize(transaction);
			}).to.throw(
				'Failed to validate transfer schema: Expected type string but found type undefined'
			);
		});

		it(`should throw error if data field length is greater than ${
			ADDITIONAL_DATA.MAX_LENGTH
		} characters`, () => {
			var invalidString = randomstring.generate(ADDITIONAL_DATA.MAX_LENGTH + 1);
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset = {
				data: invalidString,
			};

			return expect(() => {
				transfer.objectNormalize(transaction);
			}).to.throw(
				`Failed to validate transfer schema: Object didn't pass validation for format additionalData: ${invalidString}`
			);
		});

		it(`should throw error if data field length is greater than ${
			ADDITIONAL_DATA.MAX_LENGTH
		} bytes`, () => {
			var invalidString = `${randomstring.generate(
				ADDITIONAL_DATA.MAX_LENGTH - 1
			)}现`;
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset = {
				data: invalidString,
			};

			return expect(() => {
				transfer.objectNormalize(transaction);
			}).to.throw(
				`Failed to validate transfer schema: Object didn't pass validation for format additionalData: ${invalidString}`
			);
		});
	});

	describe('dbRead', () => {
		it('should return null when data field is not set', () => {
			return expect(transfer.dbRead(rawValidTransaction)).to.eql(null);
		});

		it('should be okay when data field is set', () => {
			var rawTransaction = _.cloneDeep(rawValidTransaction);
			var data = '123';
			rawTransaction.tf_data = data;

			return expect(transfer.dbRead(rawTransaction)).to.eql({
				data,
			});
		});
	});

	describe('ready', () => {
		it('should return true for single signature transaction', () => {
			return expect(transfer.ready(validTransaction, validSender)).to.equal(
				true
			);
		});

		it('should return false for multi signature transaction with less signatures', () => {
			var transaction = _.cloneDeep(validTransaction);
			var vs = _.cloneDeep(validSender);
			vs.multisignatures = [validKeypair.publicKey.toString('hex')];

			return expect(transactionLogic.ready(transaction, vs)).to.equal(false);
		});

		it('should return true for multi signature transaction with alteast min signatures', () => {
			var transaction = _.cloneDeep(validTransaction);
			var vs = _.cloneDeep(validSender);
			vs.multisignatures = [validKeypair.publicKey.toString('hex')];
			vs.multimin = 1;

			delete transaction.signature;
			transaction.signature = transactionLogic.sign(senderKeypair, transaction);
			transaction.signatures = [
				transactionLogic.multisign(validKeypair, transaction),
			];

			return expect(transactionLogic.ready(transaction, vs)).to.equal(true);
		});
	});
});
