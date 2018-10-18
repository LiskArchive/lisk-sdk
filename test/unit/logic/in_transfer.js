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
var rewire = require('rewire');
var ed = require('../../../helpers/ed');
var slots = require('../../../helpers/slots');
var typesRepresentatives = require('../../fixtures/types_representatives');
var modulesLoader = require('../../common/modules_loader');

var InTransfer = rewire('../../../logic/in_transfer.js');
var validPassphrase =
	'robust weapon course unknown head trial pencil latin acid';
var validKeypair = ed.makeKeypair(
	crypto
		.createHash('sha256')
		.update(validPassphrase, 'utf8')
		.digest()
);

const { FEES } = __testContext.config.constants;
const exceptions = __testContext.config.exceptions;

var validSender = {
	balance: '0',
	passphrase: 'zdv72jrts9y8613e4s4i',
	secondPassphrase: '33ibzztls7xlrocpzxgvi',
	username: '9bzuu',
	publicKey: '967e00fbf215b6227a6521226decfdc14c92cb88d35268787a47ff0e6b92f94a',
	address: '17603529232728446942L',
	secondPublicKey:
		'b9aa5c8d1e1cbcf97eb6393cda8315b7d35cecbc8e2eb0629fa3cf80df4cdda7',
};

var validTransaction = {
	id: '2273003018673898961',
	height: 843,
	blockId: '11870363750006389009',
	type: 6,
	timestamp: 40420761,
	senderPublicKey:
		'6dc3f3f8bcf9fb689a1ec6703ed08c649cdc98619ac4689794bf72b579d6cf25',
	requesterPublicKey: undefined,
	senderId: '2623857243537009424L',
	recipientId: null,
	recipientPublicKey: null,
	amount: 999,
	fee: 10000000,
	signature:
		'46b57a56f3a61c815224e4396c9c39316ca62568951f84c2e7404225cf67c489f517db6a848a0a5fd4f311b98102c36098543cecb277c7d039a07ed069d90b0b',
	signSignature: undefined,
	signatures: [],
	confirmations: 113,
	asset: {
		inTransfer: {
			dappId: '7400202127695414450',
		},
	},
};

var rawValidTransaction = {
	t_id: '2273003018673898961',
	b_height: 843,
	t_blockId: '11870363750006389009',
	t_type: 6,
	t_timestamp: 40420761,
	t_senderPublicKey:
		'6dc3f3f8bcf9fb689a1ec6703ed08c649cdc98619ac4689794bf72b579d6cf25',
	m_recipientPublicKey: null,
	t_senderId: '2623857243537009424L',
	t_recipientId: null,
	t_amount: '999',
	t_fee: '10000000',
	t_signature:
		'46b57a56f3a61c815224e4396c9c39316ca62568951f84c2e7404225cf67c489f517db6a848a0a5fd4f311b98102c36098543cecb277c7d039a07ed069d90b0b',
	t_SignSignature: null,
	t_signatures: null,
	confirmations: 113,
	in_dappId: '7400202127695414450',
};

var validGetGensisResult = {
	authorId: 'validAuthorId',
};

describe('inTransfer', () => {
	var inTransfer;
	var dbStub;
	var sharedStub;
	var accountsStub;
	var blocksStub;

	var trs;
	var rawTrs;
	var sender;
	var dummyBlock;

	beforeEach(done => {
		dbStub = {
			dapps: {
				countByTransactionId: sinonSandbox.stub().resolves(),
				countByOutTransactionId: sinonSandbox.stub().resolves(),
				getExisting: sinonSandbox.stub().resolves(),
				list: sinonSandbox.stub().resolves(),
				getGenesis: sinonSandbox.stub().resolves(),
			},
		};
		sharedStub = {
			getGenesis: sinonSandbox
				.stub()
				.callsArgWith(1, null, validGetGensisResult),
		};
		accountsStub = {
			mergeAccountAndGet: sinonSandbox.stub().callsArg(1),
			getAccount: sinonSandbox.stub(),
		};
		dummyBlock = {
			id: '9314232245035524467',
			height: 1,
		};
		blocksStub = {
			lastBlock: {
				get: sinonSandbox.stub().returns(dummyBlock),
			},
		};
		inTransfer = new InTransfer(dbStub, modulesLoader.scope.schema);
		inTransfer.bind(accountsStub, blocksStub, sharedStub);

		trs = _.cloneDeep(validTransaction);
		rawTrs = _.cloneDeep(rawValidTransaction);
		sender = _.cloneDeep(validSender);
		dummyBlock = {
			id: '9314232245035524467',
			height: 1,
		};
		done();
	});

	describe('constructor', () => {
		describe('library', () => {
			var library;

			beforeEach(done => {
				new InTransfer(dbStub, modulesLoader.scope.schema);
				library = InTransfer.__get__('library');
				done();
			});

			it('should assign db', () => {
				return expect(library)
					.to.have.property('db')
					.eql(dbStub);
			});

			it('should assign schema', () => {
				return expect(library)
					.to.have.property('schema')
					.eql(modulesLoader.scope.schema);
			});
		});
	});

	describe('bind', () => {
		var modules;
		var shared;

		beforeEach(done => {
			inTransfer.bind(accountsStub, blocksStub, sharedStub);
			modules = InTransfer.__get__('modules');
			shared = InTransfer.__get__('shared');
			done();
		});

		describe('modules', () => {
			it('should assign accounts', () => {
				return expect(modules)
					.to.have.property('accounts')
					.eql(accountsStub);
			});

			it('should assign blocks', () => {
				return expect(modules)
					.to.have.property('blocks')
					.eql(blocksStub);
			});
		});

		it('should assign shared', () => {
			return expect(shared).to.eql(sharedStub);
		});
	});

	describe('calculateFee', () => {
		it('should return FEES.SEND', () => {
			return expect(inTransfer.calculateFee(trs).isEqualTo(FEES.SEND)).to.be
				.true;
		});
	});

	describe('verify', () => {
		beforeEach(() => {
			return inTransfer.bind(accountsStub, blocksStub, sharedStub);
		});

		describe('when trs.recipientId exists', () => {
			it('should call callback with error = "Transaction type 6 is frozen"', done => {
				trs.recipientId = '4835566122337813671L';
				inTransfer.verify(trs, sender, err => {
					expect(err).to.equal('Transaction type 6 is frozen');
					done();
				});
			});
		});

		describe('when trs.amount = 0', () => {
			describe('when type 6 is frozen', () => {
				it('should call callback with error = "Transaction type 6 is frozen"', done => {
					trs.amount = 0;
					inTransfer.verify(trs, sender, err => {
						expect(err).to.equal('Transaction type 6 is frozen');
						done();
					});
				});
			});

			describe('when type 6 is not frozen', () => {
				it('should call callback with error = "Invalid transaction amount"', done => {
					const originalLimit = exceptions.precedent.disableDappTransfer;
					exceptions.precedent.disableDappTransfer = 5;
					trs.amount = 0;
					inTransfer.verify(trs, sender, err => {
						expect(err).to.equal('Invalid transaction amount');
						exceptions.precedent.disableDappTransfer = originalLimit;
						done();
					});
				});
			});
		});

		describe('when trs.amount is less than zero', () => {
			describe('when type 6 is frozen', () => {
				it('should call callback with error = "Transaction type 6 is frozen"', done => {
					trs.amount = -1;
					inTransfer.verify(trs, sender, err => {
						expect(err).to.equal('Transaction type 6 is frozen');
						done();
					});
				});
			});

			describe('when type 6 is not frozen', () => {
				it('should call callback with error = "Invalid transaction amount"', done => {
					const originalLimit = exceptions.precedent.disableDappTransfer;
					exceptions.precedent.disableDappTransfer = 5;
					trs.amount = -1;
					inTransfer.verify(trs, sender, err => {
						expect(err).to.equal('Invalid transaction amount');
						exceptions.precedent.disableDappTransfer = originalLimit;
						done();
					});
				});
			});
		});

		describe('when trs.asset does not exist', () => {
			it('should call callback with error = "Transaction type 6 is frozen"', done => {
				trs.asset = undefined;
				inTransfer.verify(trs, sender, err => {
					expect(err).to.equal('Transaction type 6 is frozen');
					done();
				});
			});
		});

		describe('when trs.asset.inTransfer does not exist', () => {
			it('should call callback with error = "Transaction type 6 is frozen"', done => {
				trs.asset.inTransfer = undefined;
				inTransfer.verify(trs, sender, err => {
					expect(err).to.equal('Transaction type 6 is frozen');
					done();
				});
			});
		});

		describe('when trs.asset.inTransfer = 0', () => {
			it('should call callback with error = "Transaction type 6 is frozen"', done => {
				trs.asset.inTransfer = 0;
				inTransfer.verify(trs, sender, err => {
					expect(err).to.equal('Transaction type 6 is frozen');
					done();
				});
			});
		});

		it('should call library.db.dapps.countByTransactionId', done => {
			inTransfer.verify(trs, sender, () => {
				expect(dbStub.dapps.countByTransactionId.calledOnce).to.be.false;
				done();
			});
		});

		it('should call library.db.dapps.countByTransactionId with trs.asset.inTransfer.dappId', done => {
			inTransfer.verify(trs, sender, () => {
				expect(
					dbStub.dapps.countByTransactionId.calledWith(
						trs.asset.inTransfer.dappId
					)
				).to.be.false;
				done();
			});
		});

		describe('when library.db.one fails', () => {
			beforeEach(done => {
				dbStub.dapps.countByTransactionId = sinonSandbox
					.stub()
					.rejects('Rejection error');
				done();
			});

			it('should call callback with error', done => {
				inTransfer.verify(trs, sender, err => {
					expect(err).not.to.be.empty;
					done();
				});
			});
		});

		describe('when library.db.one succeeds', () => {
			describe('when dapp does not exist', () => {
				beforeEach(done => {
					dbStub.dapps.countByTransactionId = sinonSandbox.stub().resolves(0);
					done();
				});

				it('should call callback with error = "Transaction type 6 is frozen"', done => {
					inTransfer.verify(trs, sender, err => {
						expect(err).to.equal('Transaction type 6 is frozen');
						done();
					});
				});
			});

			describe('when dapp exists', () => {
				beforeEach(done => {
					dbStub.dapps.countByTransactionId = sinonSandbox.stub().resolves(1);
					done();
				});

				it('should call callback with error = "Transaction type 6 is frozen"', done => {
					inTransfer.verify(trs, sender, err => {
						expect(err).to.equal('Transaction type 6 is frozen');
						done();
					});
				});

				it('should call callback with result = undefined', done => {
					inTransfer.verify(trs, sender, (err, res) => {
						expect(res).to.be.undefined;
						done();
					});
				});
			});
		});
	});

	describe('process', () => {
		it('should call callback with error = null', done => {
			inTransfer.process(trs, sender, err => {
				expect(err).to.be.null;
				done();
			});
		});

		it('should call callback with result = transaction', done => {
			inTransfer.process(trs, sender, (err, result) => {
				expect(result).to.eql(trs);
				done();
			});
		});
	});

	describe('getBytes', () => {
		describe('when trs.asset.inTransfer.dappId = undefined', () => {
			beforeEach(done => {
				trs.asset.inTransfer.dappId = undefined;
				done();
			});

			it('should throw', () => {
				return expect(inTransfer.getBytes.bind(null, trs)).to.throw;
			});
		});

		describe('when trs.asset.inTransfer.dappId is a valid dapp id', () => {
			it('should not throw', () => {
				return expect(inTransfer.getBytes.bind(null, trs)).not.to.throw;
			});

			it('should get bytes of valid transaction', () => {
				return expect(inTransfer.getBytes(trs).toString('utf8')).to.equal(
					validTransaction.asset.inTransfer.dappId
				);
			});

			it('should return result as a Buffer type', () => {
				return expect(inTransfer.getBytes(trs)).to.be.instanceOf(Buffer);
			});
		});
	});

	describe('applyConfirmed', () => {
		beforeEach(done => {
			inTransfer.applyConfirmed(trs, dummyBlock, sender, done);
		});

		it('should call shared.getGenesis', () => {
			return expect(sharedStub.getGenesis.calledOnce).to.be.true;
		});

		it('should call shared.getGenesis with {dappid: trs.asset.inTransfer.dappId}', () => {
			return expect(
				sharedStub.getGenesis.calledWith({
					dappid: trs.asset.inTransfer.dappId,
				})
			).to.be.true;
		});

		describe('when shared.getGenesis fails', () => {
			beforeEach(done => {
				sharedStub.getGenesis = sinonSandbox
					.stub()
					.callsArgWith(1, 'getGenesis error');
				done();
			});

			it('should call callback with error', () => {
				return inTransfer.applyConfirmed(trs, dummyBlock, sender, err => {
					expect(err).not.to.be.empty;
				});
			});
		});

		describe('when shared.getGenesis succeeds', () => {
			beforeEach(done => {
				sharedStub.getGenesis = sinonSandbox.stub().callsArg(1);
				done();
			});

			it('should call modules.accounts.mergeAccountAndGet', () => {
				return expect(accountsStub.mergeAccountAndGet.calledOnce).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with address = dapp.authorId', () => {
				return expect(
					accountsStub.mergeAccountAndGet.calledWith(
						sinonSandbox.match({ address: validGetGensisResult.authorId })
					)
				).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with balance = trs.amount', () => {
				return expect(
					accountsStub.mergeAccountAndGet.calledWith(
						sinonSandbox.match({ balance: trs.amount })
					)
				).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with u_balance = trs.amount', () => {
				return expect(
					accountsStub.mergeAccountAndGet.calledWith(
						sinonSandbox.match({ u_balance: trs.amount })
					)
				).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with round = slots.calcRound result', () => {
				return expect(
					accountsStub.mergeAccountAndGet.calledWith(
						sinonSandbox.match({ round: slots.calcRound(dummyBlock.height) })
					)
				).to.be.true;
			});
		});

		describe('when modules.accounts.mergeAccountAndGet fails', () => {
			beforeEach(done => {
				accountsStub.mergeAccountAndGet = sinonSandbox
					.stub()
					.callsArgWith(1, 'mergeAccountAndGet error');
				done();
			});

			it('should call callback with error', () => {
				return inTransfer.applyConfirmed(trs, dummyBlock, sender, err => {
					expect(err).not.to.be.empty;
				});
			});
		});

		describe('when modules.accounts.mergeAccountAndGet succeeds', () => {
			it('should call callback with error = undefined', () => {
				return inTransfer.applyConfirmed(trs, dummyBlock, sender, err => {
					expect(err).to.be.undefined;
				});
			});

			it('should call callback with result = undefined', () => {
				return inTransfer.applyConfirmed(
					trs,
					dummyBlock,
					sender,
					(err, res) => {
						expect(res).to.be.undefined;
					}
				);
			});
		});
	});

	describe('undoConfirmed', () => {
		beforeEach(done => {
			inTransfer.undoConfirmed(trs, dummyBlock, sender, done);
		});

		it('should call shared.getGenesis', () => {
			return expect(sharedStub.getGenesis.calledOnce).to.be.true;
		});

		it('should call shared.getGenesis with {dappid: trs.asset.inTransfer.dappId}', () => {
			return expect(
				sharedStub.getGenesis.calledWith({
					dappid: trs.asset.inTransfer.dappId,
				})
			).to.be.true;
		});

		describe('when shared.getGenesis fails', () => {
			beforeEach(done => {
				sharedStub.getGenesis = sinonSandbox
					.stub()
					.callsArgWith(1, 'getGenesis error');
				done();
			});

			it('should call callback with error', () => {
				return inTransfer.undoConfirmed(trs, dummyBlock, sender, err => {
					expect(err).not.to.be.empty;
				});
			});
		});

		describe('when shared.getGenesis succeeds', () => {
			beforeEach(done => {
				sharedStub.getGenesis = sinonSandbox.stub().callsArg(1);
				done();
			});

			it('should call modules.accounts.mergeAccountAndGet', () => {
				return expect(accountsStub.mergeAccountAndGet.calledOnce).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with address = dapp.authorId', () => {
				return expect(
					accountsStub.mergeAccountAndGet.calledWith(
						sinonSandbox.match({ address: validGetGensisResult.authorId })
					)
				).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with balance = -trs.amount', () => {
				return expect(
					accountsStub.mergeAccountAndGet.calledWith(
						sinonSandbox.match({ balance: -trs.amount })
					)
				).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with u_balance = -trs.amount', () => {
				return expect(
					accountsStub.mergeAccountAndGet.calledWith(
						sinonSandbox.match({ u_balance: -trs.amount })
					)
				).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with round = slots.calcRound result', () => {
				return expect(
					accountsStub.mergeAccountAndGet.calledWith(
						sinonSandbox.match({ round: slots.calcRound(dummyBlock.height) })
					)
				).to.be.true;
			});
		});

		describe('when modules.accounts.mergeAccountAndGet fails', () => {
			beforeEach(done => {
				accountsStub.mergeAccountAndGet = sinonSandbox
					.stub()
					.callsArgWith(1, 'mergeAccountAndGet error');
				done();
			});

			it('should call callback with error', () => {
				return inTransfer.undoConfirmed(trs, dummyBlock, sender, err => {
					expect(err).not.to.be.empty;
				});
			});
		});

		describe('when modules.accounts.mergeAccountAndGet succeeds', () => {
			it('should call callback with error = undefined', () => {
				return inTransfer.undoConfirmed(trs, dummyBlock, sender, err => {
					expect(err).to.be.undefined;
				});
			});

			it('should call callback with result = undefined', () => {
				return inTransfer.undoConfirmed(trs, dummyBlock, sender, (err, res) => {
					expect(res).to.be.undefined;
				});
			});
		});
	});

	describe('applyUnconfirmed', () => {
		it('should call callback with error = undefined', done => {
			inTransfer.applyUnconfirmed(trs, sender, err => {
				expect(err).to.be.undefined;
				done();
			});
		});

		it('should call callback with result = undefined', done => {
			inTransfer.applyUnconfirmed(trs, sender, (err, result) => {
				expect(result).to.be.undefined;
				done();
			});
		});
	});

	describe('undoUnconfirmed', () => {
		it('should call callback with error = undefined', done => {
			inTransfer.undoUnconfirmed(trs, sender, err => {
				expect(err).to.be.undefined;
				done();
			});
		});

		it('should call callback with result = undefined', done => {
			inTransfer.undoUnconfirmed(trs, sender, (err, result) => {
				expect(result).to.be.undefined;
				done();
			});
		});
	});

	describe('objectNormalize', () => {
		var library;
		var schemaSpy;

		beforeEach(done => {
			library = InTransfer.__get__('library');
			schemaSpy = sinonSandbox.spy(library.schema, 'validate');
			done();
		});

		afterEach(() => {
			return schemaSpy.restore();
		});

		it('should call library.schema.validate', () => {
			inTransfer.objectNormalize(trs);
			return expect(schemaSpy.calledOnce).to.be.true;
		});

		it('should call library.schema.validate with trs.asset.inTransfer', () => {
			inTransfer.objectNormalize(trs);
			return expect(schemaSpy.calledWith(trs.asset.inTransfer)).to.be.true;
		});

		it('should call library.schema.validate InTransfer.prototype.schema', () => {
			inTransfer.objectNormalize(trs);
			return expect(schemaSpy.args[0][1]).to.eql(InTransfer.prototype.schema);
		});

		describe('when transaction.asset.inTransfer is invalid object argument', () => {
			typesRepresentatives.nonObjects.forEach(nonObject => {
				it(`should throw for transaction.asset.inTransfer = ${
					nonObject.description
				}`, () => {
					return expect(
						inTransfer.objectNormalize.bind(null, nonObject.input)
					).to.throw();
				});
			});
		});

		describe('when transaction.asset.inTransfer.dappId is invalid string argument', () => {
			typesRepresentatives.nonStrings.forEach(nonString => {
				it(`should throw for transaction.asset.inTransfer.dappId = ${
					nonString.description
				}`, () => {
					trs.asset.inTransfer.dappId = nonString.input;
					return expect(inTransfer.objectNormalize.bind(null, trs)).to.throw();
				});
			});
		});

		describe('when when transaction.asset.inTransfer is valid', () => {
			it('should return transaction', () => {
				return expect(inTransfer.objectNormalize(trs)).to.eql(trs);
			});
		});
	});

	describe('dbRead', () => {
		describe('when raw.in_dappId does not exist', () => {
			beforeEach(() => {
				return delete rawTrs.in_dappId;
			});

			it('should return null', () => {
				return expect(inTransfer.dbRead(rawTrs)).to.eql(null);
			});
		});

		describe('when raw.in_dappId exists', () => {
			it('should return result containing inTransfer', () => {
				return expect(inTransfer.dbRead(rawTrs)).to.have.property('inTransfer');
			});

			it('should return result containing inTransfer.dappId = raw.dapp_id', () => {
				return expect(inTransfer.dbRead(rawTrs))
					.to.have.nested.property('inTransfer.dappId')
					.equal(rawTrs.in_dappId);
			});
		});
	});

	describe('afterSave', () => {
		it('should call callback with error = undefined', () => {
			return inTransfer.afterSave(trs, err => {
				expect(err).to.be.undefined;
			});
		});

		it('should call callback with result = undefined', () => {
			return inTransfer.afterSave(trs, (err, res) => {
				expect(res).to.be.undefined;
			});
		});
	});

	describe('ready', () => {
		it('should return true for single signature trs', () => {
			return expect(inTransfer.ready(trs, sender)).to.equal(true);
		});

		it('should return false for multi signature transaction with less signatures', () => {
			sender.multisignatures = [validKeypair.publicKey.toString('hex')];

			return expect(inTransfer.ready(trs, sender)).to.equal(false);
		});

		it('should return true for multi signature transaction with alteast min signatures', () => {
			sender.multisignatures = [validKeypair.publicKey.toString('hex')];
			sender.multimin = 1;

			delete trs.signature;
			// Not really correct signature, but we are not testing that over here
			trs.signature = crypto.randomBytes(64).toString('hex');
			trs.signatures = [crypto.randomBytes(64).toString('hex')];

			return expect(inTransfer.ready(trs, sender)).to.equal(true);
		});
	});
});
