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
const modulesLoader = require('../../../../../common/modules_loader');
const typesRepresentatives = require('../../../../../fixtures/types_representatives');
const ed = require('../../../../../../src/modules/chain/helpers/ed');

const { FEES } = __testContext.config.constants;
const Signature = rewire('../../../../../../src/modules/chain/logic/signature');
const validPassphrase =
	'robust weapon course unknown head trial pencil latin acid';
const validKeypair = ed.makeKeypair(
	crypto
		.createHash('sha256')
		.update(validPassphrase, 'utf8')
		.digest()
);

const validSender = {
	passphrase: 'yjyhgnu32jmwuii442t9',
	secondPassphrase: 'kub8gm2w330pvptx1or',
	username: 'mix8',
	publicKey: '5ff3c8f4be105953301e505d23a6e1920da9f72dc8dfd7babe1481b662f2b081',
	address: '4835566122337813671L',
	secondPublicKey:
		'ebfb1157f9f9ad223b1c7468b0d643663ec5a34ac7a6d557243834ae604d72b7',
};

const validTransaction = {
	id: '5197781214824378819',
	height: 6,
	blockId: '341020236706783045',
	type: 1,
	timestamp: 38871652,
	senderPublicKey:
		'5ff3c8f4be105953301e505d23a6e1920da9f72dc8dfd7babe1481b662f2b081',
	senderId: '4835566122337813671L',
	recipientId: null,
	recipientPublicKey: null,
	amount: 0,
	fee: 500000000,
	signature:
		'14c49a60016f63d9692821540895e1b126ab27908aefa77f4423ac0e079b6f87c8998db3e0e280aae268366adae9792d9ca279be1a372b6c52cc59b874143c07',
	signatures: [],
	confirmations: 16,
	asset: {
		signature: {
			transactionId: '5197781214824378819',
			publicKey:
				'ebfb1157f9f9ad223b1c7468b0d643663ec5a34ac7a6d557243834ae604d72b7',
		},
	},
};

const rawValidTransaction = {
	t_id: '5197781214824378819',
	b_height: 6,
	t_blockId: '341020236706783045',
	t_type: 1,
	t_timestamp: 38871652,
	t_senderPublicKey:
		'5ff3c8f4be105953301e505d23a6e1920da9f72dc8dfd7babe1481b662f2b081',
	m_recipientPublicKey: null,
	t_senderId: '4835566122337813671L',
	t_recipientId: null,
	t_amount: '0',
	t_fee: '500000000',
	t_signature:
		'14c49a60016f63d9692821540895e1b126ab27908aefa77f4423ac0e079b6f87c8998db3e0e280aae268366adae9792d9ca279be1a372b6c52cc59b874143c07',
	t_SignSignature: null,
	t_signatures: null,
	confirmations: 4,
	s_publicKey:
		'ebfb1157f9f9ad223b1c7468b0d643663ec5a34ac7a6d557243834ae604d72b7',
};

describe('signature', () => {
	let accountsMock;
	let signature;
	let dummyBlock;

	beforeEach(done => {
		dummyBlock = {
			id: '9314232245035524467',
			height: 1,
		};
		accountsMock = {
			setAccountAndGet: sinonSandbox.mock().callsArg(1),
		};
		signature = new Signature(
			modulesLoader.scope.schema,
			modulesLoader.scope.components.logger
		);
		signature.bind(accountsMock);

		done();
	});

	afterEach(() => accountsMock.setAccountAndGet.resetHistory());

	describe('with transaction and sender objects', () => {
		let transaction;
		let rawTransaction;
		let sender;

		beforeEach(done => {
			transaction = _.cloneDeep(validTransaction);
			rawTransaction = _.cloneDeep(rawValidTransaction);
			sender = _.cloneDeep(validSender);
			done();
		});

		describe('constructor', () => {
			let library;

			beforeEach(done => {
				new Signature(
					modulesLoader.scope.schema,
					modulesLoader.scope.components.logger
				);
				library = Signature.__get__('library');
				done();
			});

			it('should attach schema to library variable', async () =>
				expect(library.schema).to.eql(modulesLoader.scope.schema));

			it('should attach logger to library variable', async () =>
				expect(library.logger).to.eql(modulesLoader.scope.components.logger));
		});

		describe('bind', () => {
			describe('modules', () => {
				it('should assign accounts', async () => {
					signature.bind(accountsMock);
					const modules = Signature.__get__('modules');
					return expect(modules).to.eql({
						accounts: accountsMock,
					});
				});
			});
		});

		describe('calculateFee', () => {
			let fee;

			beforeEach(done => {
				fee = signature.calculateFee(transaction);
				done();
			});

			it('should return FEES.SECOND_SIGNATURE', async () =>
				expect(fee.isEqualTo(FEES.SECOND_SIGNATURE)).to.be.true);
		});

		describe('verify', () => {
			describe('when transaction is invalid', () => {
				describe('when asset = undefined', () => {
					it('should call callback with error = "Invalid transaction asset"', done => {
						delete transaction.asset;

						signature.verify(transaction, sender, err => {
							expect(err).to.equal('Invalid transaction asset');
							done();
						});
					});
				});

				describe('when signature = undefined', () => {
					it('should call callback with error = "Invalid transaction asset', done => {
						delete transaction.asset.signature;

						signature.verify(transaction, sender, err => {
							expect(err).to.equal('Invalid transaction asset');
							done();
						});
					});
				});

				describe('when amount != 0', () => {
					it('should call callback with error = "Invalid transaction amount', done => {
						transaction.amount = 1;

						signature.verify(transaction, sender, err => {
							expect(err).to.equal('Invalid transaction amount');
							done();
						});
					});
				});

				describe('when publicKey = undefined', () => {
					it('should call callback with error = "Invalid public key', done => {
						delete transaction.asset.signature.publicKey;

						signature.verify(transaction, sender, err => {
							expect(err).to.equal('Invalid public key');
							done();
						});
					});
				});

				describe('when publicKey is invalid', () => {
					it('should call callback with error = "Invalid public key', done => {
						transaction.asset.signature.publicKey = 'invalid-public-key';

						signature.verify(transaction, sender, err => {
							expect(err).to.equal('Invalid public key');
							done();
						});
					});
				});
			});

			describe('when transaction is valid', () => {
				it('should call callback with error = null', done => {
					signature.verify(transaction, sender, done);
				});
			});
		});

		describe('process', () => {
			it('should call callback with error = null', done => {
				signature.process(transaction, sender, done);
			});

			it('should call callback with result = transaction', done => {
				signature.process(transaction, sender, (err, res) => {
					expect(res).to.eql(transaction);
					done();
				});
			});
		});

		describe('getBytes', () => {
			describe('when asset is invalid', () => {
				describe('when transaction.asset.signature.publicKey is a number', () => {
					const validNumber = 1;

					beforeEach(done => {
						transaction.asset.signature.publicKey = validNumber;
						done();
					});

					it('should throw', async () =>
						expect(signature.getBytes.bind(transaction)).to.throw());
				});

				describe('when transaction.asset = undefined', () => {
					beforeEach(async () => delete transaction.asset);

					it('should throw', async () =>
						expect(signature.getBytes.bind(transaction)).to.throw());
				});
			});

			describe('when asset is valid', () => {
				describe('when transaction.asset.signature.publicKey is defined', () => {
					let signatureBytes;

					beforeEach(done => {
						signatureBytes = signature.getBytes(transaction);
						done();
					});

					it('should return bytes in hex format', async () =>
						expect(signatureBytes).to.eql(
							ed.hexToBuffer(transaction.asset.signature.publicKey)
						));

					it('should return bytes of length 32', async () =>
						expect(signatureBytes.length).to.equal(32));
				});
			});
		});

		describe('applyConfirmed', () => {
			beforeEach(done => {
				signature.applyConfirmed(validTransaction, dummyBlock, sender, done);
			});

			it('should call modules.accounts.setAccountAndGet', async () =>
				expect(accountsMock.setAccountAndGet.calledOnce).to.be.true);

			it('should call modules.accounts.setAccountAndGet with address = sender.address', async () =>
				expect(
					accountsMock.setAccountAndGet.calledWith(
						sinonSandbox.match({ address: sender.address })
					)
				).to.be.true);

			it('should call modules.accounts.setAccountAndGet with secondSignature = 1', async () =>
				expect(
					accountsMock.setAccountAndGet.calledWith(
						sinonSandbox.match({ secondSignature: 1 })
					)
				).to.be.true);

			it('should call modules.accounts.setAccountAndGet with secondPublicKey = validTransaction.asset.signature.publicKey', async () =>
				expect(
					accountsMock.setAccountAndGet.calledWith(
						sinonSandbox.match({
							secondPublicKey: validTransaction.asset.signature.publicKey,
						})
					)
				).to.be.true);
		});

		describe('undoConfirmed', () => {
			beforeEach(done => {
				signature.undoConfirmed(validTransaction, dummyBlock, sender, done);
			});

			it('should call modules.accounts.setAccountAndGet', async () =>
				expect(accountsMock.setAccountAndGet.calledOnce).to.be.true);

			it('should call modules.accounts.setAccountAndGet with address = sender.address', async () =>
				expect(
					accountsMock.setAccountAndGet.calledWith(
						sinonSandbox.match({ address: sender.address })
					)
				).to.be.true);

			it('should call modules.accounts.setAccountAndGet with secondSignature = 0', async () =>
				expect(
					accountsMock.setAccountAndGet.calledWith(
						sinonSandbox.match({ secondSignature: 0 })
					)
				).to.be.true);

			it('should call modules.accounts.setAccountAndGet with secondPublicKey = null', async () =>
				expect(
					accountsMock.setAccountAndGet.calledWith(
						sinonSandbox.match({ secondPublicKey: null })
					)
				).to.be.true);
		});

		describe('applyUnconfirmed', () => {
			describe('when sender has u_secondSignature', () => {
				beforeEach(done => {
					sender.u_secondSignature = 'some-second-siganture';
					done();
				});

				it('should call callback with error', done => {
					signature.applyUnconfirmed(transaction, sender, err => {
						expect(err).to.equal('Second signature already enabled');
						done();
					});
				});
			});

			describe('when sender has secondSignature', () => {
				beforeEach(done => {
					sender.secondSignature = 'some-second-siganture';
					done();
				});

				it('should call callback with error', done => {
					signature.applyUnconfirmed(transaction, sender, err => {
						expect(err).to.equal('Second signature already enabled');
						done();
					});
				});
			});

			beforeEach(done => {
				signature.applyUnconfirmed(validTransaction, sender, done);
			});

			it('should call modules.accounts.setAccountAndGet', async () =>
				expect(accountsMock.setAccountAndGet.calledOnce).to.be.true);

			it('should call modules.accounts.setAccountAndGet with address = sender.address', async () =>
				expect(
					accountsMock.setAccountAndGet.calledWith(
						sinonSandbox.match({ address: sender.address })
					)
				).to.be.true);

			it('should call modules.accounts.setAccountAndGet with u_secondSignature = 1', async () =>
				expect(
					accountsMock.setAccountAndGet.calledWith(
						sinonSandbox.match({ u_secondSignature: 1 })
					)
				).to.be.true);
		});

		describe('undoUnconfirmed', () => {
			beforeEach(done => {
				signature.undoUnconfirmed(validTransaction, sender, done);
			});

			it('should call modules.accounts.setAccountAndGet', async () =>
				expect(accountsMock.setAccountAndGet.calledOnce).to.be.true);

			it('should call modules.accounts.setAccountAndGet with address = sender.address', async () =>
				expect(
					accountsMock.setAccountAndGet.calledWith(
						sinonSandbox.match({ address: sender.address })
					)
				).to.be.true);

			it('should call modules.accounts.setAccountAndGet with u_secondSignature = 0', async () =>
				expect(
					accountsMock.setAccountAndGet.calledWith(
						sinonSandbox.match({ u_secondSignature: 0 })
					)
				).to.be.true);
		});

		describe('objectNormalize', () => {
			describe('schema.validate should validate against signature schema', () => {
				let library;
				let schemaSpy;

				beforeEach(() => {
					library = Signature.__get__('library');
					schemaSpy = sinonSandbox.spy(library.schema, 'validate');
					return signature.objectNormalize(transaction);
				});

				afterEach(() => schemaSpy.restore());

				it('call schema validate once', async () =>
					expect(schemaSpy.calledOnce).to.equal(true));

				it('signature schema', async () =>
					expect(
						schemaSpy.calledWithExactly(
							transaction.asset.signature,
							Signature.prototype.schema
						)
					).to.equal(true));
			});

			describe('when schema.validate fails', () => {
				describe('for non-string types', () => {
					const nonStrings = _.difference(
						typesRepresentatives.allTypes,
						typesRepresentatives.strings
					);

					nonStrings.forEach(type => {
						it(`should throw when username type is ${
							type.description
						}`, async () => {
							transaction.asset.signature.publicKey = type.input;
							return expect(() => {
								signature.objectNormalize(transaction);
							}).to.throw(
								`Failed to validate signature schema: Expected type string but found type ${
									type.expectation
								}`
							);
						});
					});
				});

				describe('for non-publicKey format strings', () => {
					const nonEmptyStrings = typesRepresentatives.nonEmptyStrings;

					nonEmptyStrings.forEach(type => {
						it(`should throw when username is: ${
							type.description
						}`, async () => {
							transaction.asset.signature.publicKey = type.input;
							return expect(() => {
								signature.objectNormalize(transaction);
							}).to.throw(
								`Failed to validate signature schema: Object didn't pass validation for format publicKey: ${
									type.input
								}`
							);
						});
					});
				});
			});

			describe('when library.schema.validate succeeds', () => {
				it('should return transaction', async () =>
					expect(signature.objectNormalize(transaction)).to.eql(transaction));
			});
		});

		describe('dbRead', () => {
			describe('when publicKey is undefined', () => {
				beforeEach(async () => delete rawTransaction.s_publicKey);

				it('should return null', async () =>
					expect(signature.dbRead(rawTransaction)).to.eql(null));
			});

			describe('with valid signature properties', () => {
				const publicKey =
					'ebfb1157f9f9ad223b1c7468b0d643663ec5a34ac7a6d557243834ae604d72b7';
				const transactionId = '5197781214824378819';

				it('should return publicKey property', async () =>
					expect(signature.dbRead(rawTransaction).signature.publicKey).to.equal(
						publicKey
					));

				it('should return transactionId', async () =>
					expect(
						signature.dbRead(rawTransaction).signature.transactionId
					).to.eql(transactionId));
			});
		});

		describe('ready', () => {
			it('should return true for single signature transaction', async () =>
				expect(signature.ready(transaction, sender)).to.equal(true));

			it('should return false for multi signature transaction with less signatures', async () => {
				sender.membersPublicKeys = [validKeypair.publicKey.toString('hex')];

				return expect(signature.ready(transaction, sender)).to.equal(false);
			});

			it('should return true for multi signature transaction with at least min signatures', async () => {
				sender.membersPublicKeys = [validKeypair.publicKey.toString('hex')];
				sender.multiMin = 1;

				delete transaction.signature;
				// Not really correct signature, but we are not testing that over here
				transaction.signature = crypto.randomBytes(64).toString('hex');
				transaction.signatures = [crypto.randomBytes(64).toString('hex')];

				return expect(signature.ready(transaction, sender)).to.equal(true);
			});
		});
	});
});
