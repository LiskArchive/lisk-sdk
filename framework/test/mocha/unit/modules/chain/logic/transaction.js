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
const {
	transfer,
	utils: transactionUtils,
} = require('@liskhq/lisk-transactions');
const accountFixtures = require('../../../../fixtures/accounts');
const modulesLoader = require('../../../../common/modules_loader');
const application = require('../../../../common/application');
const ed = require('../../../../../../src/modules/chain/helpers/ed');
const Bignum = require('../../../../../../src/modules/chain/helpers/bignum');
const slots = require('../../../../../../src/modules/chain/helpers/slots');
const Vote = require('../../../../../../src/modules/chain/logic/vote');
const Transfer = require('../../../../../../src/modules/chain/logic/transfer');
const Delegate = require('../../../../../../src/modules/chain/logic/delegate');
const Signature = require('../../../../../../src/modules/chain/logic/signature');
const Multisignature = require('../../../../../../src/modules/chain/logic/multisignature');
const Dapp = require('../../../../../../src/modules/chain/logic/dapp');
const InTransfer = require('../../../../../../src/modules/chain/logic/in_transfer');
const OutTransfer = require('../../../../../../src/modules/chain/logic/out_transfer');
const MultisignatureMocks = require('./test_data/multisignature');

const { TOTAL_AMOUNT, TRANSACTION_TYPES } = __testContext.config.constants;
const exceptions = global.exceptions;

const validPassphrase =
	'robust weapon course unknown head trial pencil latin acid';
const validKeypair = ed.makeKeypair(
	crypto
		.createHash('sha256')
		.update(validPassphrase, 'utf8')
		.digest()
);

const senderPassphrase = accountFixtures.genesis.passphrase;

const generateHash = passPhrase =>
	crypto
		.createHash('sha256')
		.update(passPhrase || senderPassphrase, 'utf8')
		.digest();

const senderKeyPair = passPhrase => {
	const userHash = generateHash(passPhrase);
	return ed.makeKeypair(userHash);
};

const keyPair = senderKeyPair();

const sender = {
	username: null,
	isDelegate: 0,
	secondSignature: 0,
	address: '16313739661670634666L',
	publicKey: 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	secondPublicKey: null,
	balance: new Bignum('9850458911801508'),
	u_balance: new Bignum('9850458911801508'),
	vote: 0,
	multisignatures: null,
	multimin: 0,
	multilifetime: 0,
	blockId: '8505659485551877884',
	nameexist: 0,
	producedBlocks: 0,
	missedBlocks: 0,
	fees: new Bignum('0'),
	rewards: new Bignum('0'),
};

const transactionData = {
	type: 0,
	amount: new Bignum('8067474861277'),
	sender,
	senderId: '16313739661670634666L',
	recipientId: '5649948960790668770L',
	fee: new Bignum('10000000'),
	publicKey: 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	passphrase: senderPassphrase,
};

const validTransaction = {
	id: '16140284222734558289',
	rowId: 133,
	blockId: '1462190441827192029',
	type: 0,
	timestamp: 33363661,
	senderPublicKey:
		'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	senderId: '16313739661670634666L',
	recipientId: '5649948960790668770L',
	amount: new Bignum('8067474861277'),
	fee: new Bignum('10000000'),
	signature:
		'7ff5f0ee2c4d4c83d6980a46efe31befca41f7aa8cda5f7b4c2850e4942d923af058561a6a3312005ddee566244346bdbccf004bc8e2c84e653f9825c20be008',
	signSignature: null,
	requesterPublicKey: null,
	signatures: null,
	asset: {},
};

const rawTransaction = {
	t_id: '16140284222734558289',
	b_height: 981,
	t_blockId: '1462190441827192029',
	t_type: 0,
	t_timestamp: 33363661,
	t_senderPublicKey:
		'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	m_recipientPublicKey: null,
	t_senderId: '16313739661670634666L',
	t_recipientId: '5649948960790668770L',
	t_amount: new Bignum('8067474861277'),
	t_fee: new Bignum('10000000'),
	t_signature:
		'7ff5f0ee2c4d4c83d6980a46efe31befca41f7aa8cda5f7b4c2850e4942d923af058561a6a3312005ddee566244346bdbccf004bc8e2c84e653f9825c20be008',
	tf_data: '123',
	confirmations: 8343,
};

const genesisTransaction = {
	type: 0,
	amount: new Bignum('10000000000000000'),
	fee: new Bignum('0'),
	timestamp: 0,
	recipientId: '16313739661670634666L',
	senderId: '1085993630748340485L',
	senderPublicKey:
		'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
	signature:
		'd8103d0ea2004c3dea8076a6a22c6db8bae95bc0db819240c77fc5335f32920e91b9f41f58b01fc86dfda11019c9fd1c6c3dcbab0a4e478e3c9186ff6090dc05',
	blockId: '9314232245035524467',
	id: '1465651642158264047',
};

const unconfirmedTransaction = {
	type: 0,
	amount: new Bignum('8067474861277'),
	senderPublicKey:
		'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	senderId: '16313739661670634666L',
	requesterPublicKey: null,
	timestamp: 33641482,
	asset: {},
	data: undefined,
	recipientId: '5649948960790668770L',
	signature:
		'24c65ac5562a8ae252aa308926b60342829e82f285e704814d0d3c3954078c946d113aa0bd5388b2c863874e63f71e8e0a284a03274e66c719e69d443d91f309',
	fee: new Bignum('10000000'),
	id: '16580139363949197645',
};

describe('transaction', () => {
	let transactionLogic;
	let accountLogic;
	let accountModule;

	before(done => {
		const transferTransaction = new Transfer({
			components: {
				logger: modulesLoader.scope.components.logger,
			},
			schema: modulesLoader.scope.schema,
		});
		application.init(
			{ sandbox: { name: 'lisk_test_logic_transactions' } },
			(_err, scope) => {
				transactionLogic = scope.logic.transaction;
				accountLogic = scope.logic.account;
				accountModule = scope.modules.accounts;
				transferTransaction.bind(accountModule);
				transactionLogic.attachAssetType(
					TRANSACTION_TYPES.SEND,
					transferTransaction
				);
				done();
			}
		);
	});

	after(done => {
		application.cleanup(done);
	});

	describe('sign', () => {
		it('should throw an error with no param', async () =>
			expect(transactionLogic.sign).to.throw());

		it('should throw an error Argument must be a valid hex string.', done => {
			const invalidTransaction = Object.assign({}, validTransaction);
			let error;
			invalidTransaction.senderPublicKey =
				'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6fx';
			try {
				transactionLogic.sign(keyPair, invalidTransaction);
			} catch (e) {
				error = e.message;
			} finally {
				expect(error).to.equal('Argument must be a valid hex string.');
			}
			done();
		});

		it('should sign transaction', async () =>
			expect(transactionLogic.sign(keyPair, validTransaction))
				.to.be.a('string')
				.which.is.equal(
					'8f9c4242dc562599f95f5481469d22567987536112663156761e4b2b3f1142c4f5355a2a7c7b254f40d370bef7e76b4a11c8a1836e0c9b0bcab3e834ca1e7502'
				));

		it('should update signature when data is changed', async () => {
			const originalSignature = validTransaction.signature;
			const transaction = _.cloneDeep(validTransaction);
			transaction.data = '123';

			return expect(transactionLogic.sign(keyPair, transaction))
				.to.be.a('string')
				.which.is.not.equal(originalSignature);
		});
	});

	describe('multisign', () => {
		it('should throw an error with no param', async () =>
			expect(transactionLogic.multisign).to.throw());

		it('should multisign the transaction', async () =>
			expect(transactionLogic.multisign(keyPair, validTransaction)).to.equal(
				validTransaction.signature
			));
	});

	describe('getId', () => {
		it('should throw an error with no param', async () =>
			expect(transactionLogic.getId).to.throw());

		it('should generate the id of the transaction', async () =>
			expect(transactionLogic.getId(validTransaction))
				.to.be.a('string')
				.which.is.equal(validTransaction.id));

		it('should update id if a field in transaction value changes', async () => {
			const id = validTransaction.id;
			const transaction = _.cloneDeep(validTransaction);
			transaction.amount = 4000;

			return expect(transactionLogic.getId(transaction)).to.not.equal(id);
		});
	});

	describe('getHash', () => {
		it('should throw an error with no param', async () =>
			expect(transactionLogic.getHash).to.throw());

		it('should return hash for transaction', async () => {
			const transaction = validTransaction;
			const expectedHash =
				'5164ef55fccefddf72360ea6e05f19eed7c8d2653c5069df4db899c47246dd2f';

			return expect(transactionLogic.getHash(transaction).toString('hex'))
				.to.be.a('string')
				.which.is.equal(expectedHash);
		});

		it('should update hash if a field is transaction value changes', async () => {
			const originalTransactionHash =
				'5164ef55fccefddf72360ea6e05f19eed7c8d2653c5069df4db899c47246dd2f';
			const transaction = _.cloneDeep(validTransaction);
			transaction.amount = 4000;

			return expect(
				transactionLogic.getHash(transaction).toString('hex')
			).to.not.equal(originalTransactionHash);
		});
	});

	describe('getBytes', () => {
		it('should throw an error with no param', async () =>
			expect(transactionLogic.getBytes).to.throw());

		it('should return same result when called multiple times (without data field)', async () => {
			const firstCalculation = transactionLogic.getBytes(validTransaction);
			const secondCalculation = transactionLogic.getBytes(validTransaction);

			return expect(firstCalculation.equals(secondCalculation)).to.be.ok;
		});

		it('should return same result of getBytes using /logic/transaction and lisk-elements package (without data field)', async () => {
			const transactionBytesFromLogic = transactionLogic.getBytes(
				validTransaction
			);
			const transactionBytesFromLiskJs = transactionUtils.getTransactionBytes(
				validTransaction
			);

			return expect(
				transactionBytesFromLogic.equals(transactionBytesFromLiskJs)
			).to.be.ok;
		});

		it('should skip signature, second signature for getting bytes', async () => {
			const transactionBytes = transactionLogic.getBytes(
				validTransaction,
				true
			);

			return expect(transactionBytes.length).to.equal(53);
		});
	});

	describe('ready', () => {
		it('should throw an error with no param', async () =>
			expect(transactionLogic.ready).to.throw());

		it('should throw error when transaction type is invalid', async () => {
			const transaction = _.cloneDeep(validTransaction);
			const invalidTransactionType = -1;
			transaction.type = invalidTransactionType;

			return expect(() => {
				transactionLogic.ready(transaction, sender);
			}).to.throw(`Unknown transaction type ${invalidTransactionType}`);
		});

		it('should return false when sender not provided', async () =>
			expect(transactionLogic.ready(validTransaction)).to.equal(false));

		it('should return true for valid transaction and sender', async () =>
			expect(transactionLogic.ready(validTransaction, sender)).to.equal(true));

		it('should correct true property when signatures present and ready set to false', async () => {
			const transactionAllSignaturesReadyFalse = _.cloneDeep(
				MultisignatureMocks.invalidAllSignaturesReadyFalse
			);
			const correctedTransaction = transactionLogic.ready(
				transactionAllSignaturesReadyFalse,
				sender
			);
			return expect(correctedTransaction).to.equal(true);
		});

		it('should correct true property when signatures not present and ready set to true', async () => {
			const transactionNoSignaturesReadyTrue = _.cloneDeep(
				MultisignatureMocks.invalidNoSignaturesReadyTrue
			);
			const correctedTransaction = transactionLogic.ready(
				transactionNoSignaturesReadyTrue,
				sender
			);
			return expect(correctedTransaction).to.equal(false);
		});

		it('should correct true property when signatures present but less than min, ready set to true', async () => {
			const transactionSomeSignaturesReadyTrue = _.cloneDeep(
				MultisignatureMocks.invalidSomeSignaturesReadyTrue
			);

			const correctedTransaction = transactionLogic.ready(
				transactionSomeSignaturesReadyTrue,
				sender
			);
			return expect(correctedTransaction).to.equal(false);
		});

		it('should set ready for type 0 if not present', async () => {
			const typeZero = _.cloneDeep(validTransaction);
			const correctedTransaction = transactionLogic.ready(typeZero, sender);
			return expect(correctedTransaction).to.equal(true);
		});
	});

	describe('isConfirmed', () => {
		it('should throw an error with no param', async () =>
			expect(transactionLogic.isConfirmed.bind(transactionLogic)).to.throw(
				"Cannot read property 'id' of undefined"
			));

		it('should return false if transaction is not confirmed', done => {
			transactionLogic.isConfirmed(validTransaction, (err, isConfirmed) => {
				expect(err).to.not.exist;
				expect(isConfirmed).to.equal(false);
				done();
			});
		});

		it('should return 1 for transaction from genesis block', done => {
			transactionLogic.isConfirmed(genesisTransaction, (err, isConfirmed) => {
				expect(err).to.not.exist;
				expect(isConfirmed).to.equal(true);
				done();
			});
		});
	});

	describe('checkConfirmed', () => {
		it('should throw an error with no param', async () =>
			expect(transactionLogic.checkConfirmed.bind(transactionLogic)).to.throw(
				'Callback must be a function'
			));

		it('should return an error with no transaction', done => {
			transactionLogic.checkConfirmed(null, err => {
				expect(err).to.equal('Invalid transaction id');
				done();
			});
		});

		it('should not return error when transaction is not confirmed', done => {
			const transaction = transfer({
				amount: transactionData.amount.toString(),
				passphrase: transactionData.passphrase,
				recipientId: transactionData.recipientId,
			});

			transactionLogic.checkConfirmed(transaction, err => {
				expect(err).to.be.a('null');
				done();
			});
		});

		it('should return true for transaction which is already confirmed', done => {
			const dummyConfirmedTransaction = {
				id: '1465651642158264047',
			};

			transactionLogic.checkConfirmed(
				dummyConfirmedTransaction,
				(err, isConfirmed) => {
					expect(err).to.be.a('null');
					expect(isConfirmed).to.be.true;
					done();
				}
			);
		});
	});

	describe('checkBalance', () => {
		it('should throw an error with no param', async () =>
			expect(transactionLogic.checkBalance).to.throw());

		it('should return error when sender has insufficiant balance', async () => {
			const amount = '9850458911801509';
			const balanceKey = 'balance';
			const res = transactionLogic.checkBalance(
				amount,
				balanceKey,
				validTransaction,
				sender
			);

			expect(res.exceeded).to.equal(true);
			return expect(res.error).to.include('Account does not have enough LSK:');
		});

		it('should be okay if insufficient balance from genesis account', async () => {
			const amount = '999823366072900';
			const balanceKey = 'balance';
			const res = transactionLogic.checkBalance(
				amount,
				balanceKey,
				genesisTransaction,
				sender
			);

			expect(res.exceeded).to.equal(false);
			return expect(res.error).to.not.exist;
		});

		it('should be okay if sender has sufficient balance', async () => {
			const balanceKey = 'balance';
			const res = transactionLogic.checkBalance(
				validTransaction.amount,
				balanceKey,
				validTransaction,
				sender
			);

			expect(res.exceeded).to.equal(false);
			return expect(res.error).to.not.exist;
		});
	});

	describe('process', () => {
		it('should throw an error with no param', async () =>
			expect(transactionLogic.process).to.throw());

		it('should return error sender is not supplied', done => {
			transactionLogic.process(validTransaction, null, err => {
				expect(err).to.equal('Missing sender');
				done();
			});
		});

		it('should return error if generated id is different from id supplied of transaction', done => {
			const transaction = _.cloneDeep(validTransaction);
			transaction.id = 'invalid transaction id';

			transactionLogic.process(transaction, sender, err => {
				expect(err).to.equal('Invalid transaction id');
				done();
			});
		});

		it('should return error when failed to generate id', done => {
			const transaction = {
				type: 0,
			};

			transactionLogic.process(transaction, sender, err => {
				expect(err).to.equal('Failed to get transaction id');
				done();
			});
		});

		it('should process the transaction', done => {
			transactionLogic.process(validTransaction, sender, (err, res) => {
				expect(err).to.not.be.ok;
				expect(res).to.be.an('object');
				expect(res.senderId)
					.to.be.a('string')
					.which.is.equal(sender.address);
				done();
			});
		});
	});

	describe('verify', () => {
		function createAndProcess(transactionDataArg, senderArg, cb) {
			const transferObject = {
				amount: transactionDataArg.amount.toString(),
				passphrase: transactionDataArg.passphrase,
				secondPassphrase: transactionDataArg.secondPassphrase,
				recipientId: transactionDataArg.recipientId,
			};
			const transaction = transfer(transferObject);
			transaction.amount = new Bignum(transaction.amount);
			transaction.fee = new Bignum(transaction.fee);
			transactionLogic.process(
				transaction,
				senderArg,
				(err, processedTransaction) => {
					cb(err, processedTransaction);
				}
			);
		}

		it('should return error when sender is missing', done => {
			transactionLogic.verify(validTransaction, null, null, null, err => {
				expect(err).to.equal('Missing sender');
				done();
			});
		});

		it('should return error with invalid transaction type', done => {
			const transaction = _.cloneDeep(validTransaction);
			transaction.type = -1;

			transactionLogic.verify(transaction, sender, null, null, err => {
				expect(err).to.include('Unknown transaction type');
				done();
			});
		});

		it('should return error when transaction is type 1 and sender already has second signature enabled', done => {
			const transaction = _.cloneDeep(validTransaction);
			transaction.type = 1;
			transaction.asset = {
				signature: validKeypair.publicKey,
			};

			const vs = _.cloneDeep(sender);
			vs.secondSignature = true;

			transactionLogic.verify(transaction, vs, null, null, err => {
				expect(err).to.equal('Sender already has second signature enabled');
				done();
			});
		});

		it('should return error when missing sender second signature', done => {
			const transaction = _.cloneDeep(validTransaction);
			const vs = _.cloneDeep(sender);
			vs.secondSignature =
				'839eba0f811554b9f935e39a68b3078f90bea22c5424d3ad16630f027a48362f78349ddc3948360045d6460404f5bc8e25b662d4fd09e60c89453776962df40d';

			transactionLogic.verify(transaction, vs, null, null, err => {
				expect(err).to.include('Missing sender second signature');
				done();
			});
		});

		it('should return error when sender does not have a second signature', done => {
			const transaction = _.cloneDeep(validTransaction);
			transaction.signSignature = [
				transactionLogic.sign(validKeypair, transaction),
			];

			transactionLogic.verify(transaction, sender, null, null, err => {
				expect(err).to.include('Sender does not have a second signature');
				done();
			});
		});

		it('should return error when requester does not have a second signature', done => {
			const transaction = _.cloneDeep(validTransaction);
			const dummyRequester = {
				secondSignature:
					'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
			};
			transaction.requesterPublicKey =
				'839eba0f811554b9f935e39a68b3078f90bea22c5424d3ad16630f027a48362f78349ddc3948360045d6460404f5bc8e25b662d4fd09e60c89453776962df40d';

			transactionLogic.verify(
				transaction,
				sender,
				dummyRequester,
				null,
				err => {
					expect(err).to.include('Multisig request is not allowed');
					done();
				}
			);
		});

		it('should return error when transaction sender publicKey and sender public key are different', done => {
			const transaction = _.cloneDeep(validTransaction);
			const invalidPublicKey =
				'01389197bbaf1afb0acd47bbfeabb34aca80fb372a8f694a1c0716b3398db746';
			transaction.senderPublicKey = invalidPublicKey;

			transactionLogic.verify(transaction, sender, null, null, err => {
				expect(err).to.include(
					[
						'Invalid sender public key:',
						invalidPublicKey,
						'expected:',
						sender.publicKey,
					].join(' ')
				);
				done();
			});
		});

		it('should be impossible to send the money from genesis account', done => {
			const transaction = _.cloneDeep(validTransaction);
			// genesis account info
			transaction.senderPublicKey =
				'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8';
			const vs = _.cloneDeep(sender);
			vs.publicKey =
				'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8';

			transactionLogic.verify(transaction, vs, null, null, err => {
				expect(err).to.include(
					'Invalid sender. Can not send from genesis account'
				);
				done();
			});
		});

		it('should return error on different sender address in transaction and sender', done => {
			const transaction = _.cloneDeep(validTransaction);
			transaction.senderId = '2581762640681118072L';

			transactionLogic.verify(transaction, sender, null, null, err => {
				expect(err).to.include('Invalid sender address');
				done();
			});
		});

		it('should return error when transaction has requester', done => {
			const transaction = _.cloneDeep(validTransaction);
			const vs = _.cloneDeep(sender);
			// Different publicKey for multisignature account
			vs.membersPublicKeys = [accountFixtures.existingDelegate.publicKey];
			transaction.requesterPublicKey = validKeypair.publicKey.toString('hex');
			delete transaction.signature;
			transaction.signature = transactionLogic.sign(validKeypair, transaction);

			transactionLogic.verify(transaction, vs, null, null, err => {
				expect(err).to.equal('Multisig request is not allowed');
				done();
			});
		});

		it('should return error when signature is not correct', done => {
			const transaction = _.cloneDeep(validTransaction);
			// valid keypair is a different account
			transaction.signature = transactionLogic.sign(validKeypair, transaction);

			transactionLogic.verify(transaction, sender, null, null, err => {
				expect(err).to.equal('Failed to verify signature');
				done();
			});
		});

		it('should return error when duplicate signature in transaction', done => {
			const transaction = _.cloneDeep(validTransaction);
			const vs = _.cloneDeep(sender);
			vs.membersPublicKeys = [validKeypair.publicKey.toString('hex')];
			delete transaction.signature;
			transaction.signatures = Array(...Array(2)).map(() =>
				transactionLogic.sign(validKeypair, transaction)
			);
			transaction.signature = transactionLogic.sign(keyPair, transaction);
			transactionLogic.verify(transaction, vs, null, null, err => {
				expect(err).to.equal('Encountered duplicate signature in transaction');
				done();
			});
		});

		it('should be okay with valid multisignature', done => {
			const transaction = _.cloneDeep(validTransaction);
			const vs = _.cloneDeep(sender);
			vs.membersPublicKeys = [validKeypair.publicKey.toString('hex')];
			delete transaction.signature;
			transaction.signature = transactionLogic.sign(keyPair, transaction);
			transaction.signatures = [
				transactionLogic.multisign(validKeypair, transaction),
			];
			transaction.amount = new Bignum(transaction.amount);
			transaction.fee = new Bignum(transaction.fee);

			transactionLogic.verify(transaction, vs, null, null, err => {
				expect(err).to.not.exist;
				done();
			});
		});

		it('should return error when second signature is invalid', done => {
			const vs = _.cloneDeep(sender);
			vs.secondPublicKey = validKeypair.publicKey.toString('hex');
			vs.secondSignature = 1;

			const transactionDataClone = _.cloneDeep(transactionData);
			transactionDataClone.passphrase = senderPassphrase;
			transactionDataClone.secondPassphrase = validPassphrase;

			createAndProcess(transactionDataClone, vs, (_err, transaction) => {
				transaction.signSignature =
					'7af5f0ee2c4d4c83d6980a46efe31befca41f7aa8cda5f7b4c2850e4942d923af058561a6a3312005ddee566244346bdbccf004bc8e2c84e653f9825c20be008';
				transactionLogic.verify(transaction, vs, null, null, err => {
					expect(err).to.equal('Failed to verify second signature');
					done();
				});
			});
		});

		it('should be okay for valid second signature', done => {
			const vs = _.cloneDeep(sender);
			vs.secondPublicKey = validKeypair.publicKey.toString('hex');
			vs.secondSignature = 1;

			const transactionDataClone = _.cloneDeep(transactionData);
			transactionDataClone.passphrase = senderPassphrase;
			transactionDataClone.secondPassphrase = validPassphrase;

			createAndProcess(transactionDataClone, vs, (_err, transaction) => {
				transactionLogic.verify(transaction, vs, null, null, err => {
					expect(err).to.not.exist;
					done();
				});
			});
		});

		it('should throw return error transaction fee is incorrect', done => {
			const transaction = _.cloneDeep(validTransaction);
			transaction.amount = new Bignum(transaction.amount);
			transaction.fee = new Bignum(-100);

			transactionLogic.verify(transaction, sender, null, null, err => {
				expect(err).to.include('Invalid transaction fee');
				done();
			});
		});

		it('should verify transaction with correct fee (with data field)', done => {
			const transaction = _.cloneDeep(validTransaction);
			transaction.asset = { data: '123' };
			delete transaction.signature;
			transaction.signature = transactionLogic.sign(keyPair, transaction);
			transaction.amount = new Bignum(transaction.amount);
			transaction.fee = new Bignum(transaction.fee);

			transactionLogic.verify(transaction, sender, null, null, err => {
				expect(err).to.not.exist;
				done();
			});
		});

		it('should verify transaction with correct fee (without data field)', done => {
			transactionLogic.verify(validTransaction, sender, null, null, err => {
				expect(err).to.not.exist;
				done();
			});
		});

		it("should return error when transaction amount is bigger than postgreSQL's Max BigInt value", done => {
			// lisk-elements cannot create a transaction with higher amount than max amount. So, this test needs to use hardcoded transaction object
			const transaction = {
				type: 0,
				amount: new Bignum('1000000000000000000000000000'),
				senderId: '16313739661670634666L',
				fee: new Bignum(10000000),
				recipientId: '16313739661670634666L',
				senderPublicKey:
					'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
				timestamp: 69548399,
				asset: {},
				signature:
					'd6a9824d7b88bdde4426f3496881e54d42b6b1d1f06e2d11e46b3f1901d2b2b826a992104e618ec62ba01deb1e3b31820eb77bd26aa6d4a972e0bbd2503db60c',
				id: '16729891751827725251',
			};

			transactionLogic.verify(transaction, sender, null, null, err => {
				expect(err).to.include('Invalid transaction amount');
				done();
			});
		});

		it('should return error when account balance is less than transaction amount', done => {
			const transactionDataClone = _.cloneDeep(transactionData);
			transactionDataClone.amount = TOTAL_AMOUNT;

			createAndProcess(transactionDataClone, sender, (_err, transaction) => {
				transactionLogic.verify(transaction, sender, null, null, err => {
					expect(err).to.include('Account does not have enough LSK:');
					done();
				});
			});
		});

		it('should return error on timestamp below the int32 range', done => {
			const transaction = _.cloneDeep(validTransaction);
			transaction.timestamp = -2147483648 - 1;
			delete transaction.signature;
			transaction.signature = transactionLogic.sign(keyPair, transaction);
			transaction.amount = new Bignum(transaction.amount);
			transaction.fee = new Bignum(transaction.fee);
			transactionLogic.verify(transaction, sender, null, null, err => {
				expect(err).to.eql(
					'Invalid transaction timestamp. Timestamp is not in the int32 range'
				);
				done();
			});
		});

		it('should return error on timestamp above the int32 range', done => {
			const transaction = _.cloneDeep(validTransaction);
			transaction.timestamp = 2147483647 + 1;
			delete transaction.signature;
			transaction.signature = transactionLogic.sign(keyPair, transaction);
			transaction.amount = new Bignum(transaction.amount);
			transaction.fee = new Bignum(transaction.fee);
			transactionLogic.verify(transaction, sender, null, null, err => {
				expect(err).to.eql(
					'Invalid transaction timestamp. Timestamp is not in the int32 range'
				);
				done();
			});
		});

		it('should return error on future timestamp', done => {
			const transaction = _.cloneDeep(validTransaction);
			transaction.timestamp = slots.getTime() + 100;
			delete transaction.signature;

			transaction.signature = transactionLogic.sign(keyPair, transaction);
			transaction.amount = new Bignum(transaction.amount);
			transaction.fee = new Bignum(transaction.fee);

			transactionLogic.verify(transaction, sender, null, null, err => {
				expect(err).to.eql(
					'Invalid transaction timestamp. Timestamp is in the future'
				);
				done();
			});
		});

		it('should verify proper transaction with proper sender', done => {
			transactionLogic.verify(validTransaction, sender, null, null, err => {
				expect(err).to.not.be.ok;
				done();
			});
		});

		it('should throw an error with no param', async () =>
			expect(transactionLogic.verify).to.throw());
	});

	describe('verifySignature', () => {
		it('should throw an error with no param', async () =>
			expect(transactionLogic.verifySignature).to.throw());

		it('should return false if transaction is changed', async () => {
			const transaction = _.cloneDeep(validTransaction);
			// change transaction value
			transaction.amount = 1001;

			return expect(
				transactionLogic.verifySignature(
					transaction,
					sender.publicKey,
					transaction.signature
				)
			).to.equal(false);
		});

		it('should return false if signature not provided', async () =>
			expect(
				transactionLogic.verifySignature(
					validTransaction,
					sender.publicKey,
					null
				)
			).to.equal(false));

		it('should return valid signature for correct transaction', async () =>
			expect(
				transactionLogic.verifySignature(
					validTransaction,
					sender.publicKey,
					validTransaction.signature
				)
			).to.equal(true));

		it('should throw if public key is invalid', async () => {
			const transaction = _.cloneDeep(validTransaction);
			const invalidPublicKey = '123123123';

			return expect(() => {
				transactionLogic.verifySignature(
					transaction,
					invalidPublicKey,
					transaction.signature
				);
			}).to.throw();
		});
	});

	describe('verifySecondSignature', () => {
		it('should throw an error with no param', async () =>
			expect(transactionLogic.verifySecondSignature).to.throw());

		it('should verify the second signature correctly', async () => {
			const signature = transactionLogic.sign(validKeypair, validTransaction);

			return expect(
				transactionLogic.verifySecondSignature(
					validTransaction,
					validKeypair.publicKey.toString('hex'),
					signature
				)
			).to.equal(true);
		});
	});

	describe('verifyBytes', () => {
		it('should throw an error with no param', async () =>
			expect(transactionLogic.verifyBytes).to.throw());

		it('should return when sender public is different', async () => {
			const transactionBytes = transactionLogic.getBytes(validTransaction);
			const invalidPublicKey =
				'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9';

			return expect(
				transactionLogic.verifyBytes(
					transactionBytes,
					invalidPublicKey,
					validTransaction.signature
				)
			).to.equal(false);
		});

		it('should throw when publickey is not in the right format', async () => {
			const transactionBytes = transactionLogic.getBytes(validTransaction);
			const invalidPublicKey =
				'iddb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9';

			return expect(() => {
				transactionLogic.verifyBytes(
					transactionBytes,
					invalidPublicKey,
					validTransaction.signature
				);
			}).to.throw();
		});

		it('should be okay for valid bytes', async () => {
			const transactionBytes = transactionLogic.getBytes(
				validTransaction,
				true,
				true
			);
			const res = transactionLogic.verifyBytes(
				transactionBytes,
				validTransaction.senderPublicKey,
				validTransaction.signature
			);

			return expect(res).to.equal(true);
		});
	});

	describe('applyConfirmed', () => {
		const dummyBlock = {
			id: '9314232245035524467',
			height: 1,
		};

		function undoConfirmedTransaction(transaction, senderArg, done) {
			transactionLogic.undoConfirmed(transaction, dummyBlock, senderArg, done);
		}

		it('should throw an error with no param', async () =>
			expect(() => {
				transactionLogic.applyConfirmed();
			}).to.throw());

		it('should be okay with valid params', done => {
			transactionLogic.applyConfirmed(
				unconfirmedTransaction,
				dummyBlock,
				sender,
				done
			);
		});

		it('should return error on if balance is low', done => {
			const transaction = _.cloneDeep(validTransaction);
			transaction.amount = new Bignum('9850458911801908');

			transactionLogic.applyConfirmed(transaction, dummyBlock, sender, err => {
				expect(err).to.include('Account does not have enough ');
				done();
			});
		});

		it('should subtract balance from sender account on valid transaction', done => {
			accountModule.getAccount(
				{ publicKey: validTransaction.senderPublicKey },
				(_err, accountBefore) => {
					const amount = new Bignum(validTransaction.amount.toString()).plus(
						validTransaction.fee.toString()
					);
					const balanceBefore = new Bignum(accountBefore.balance.toString());

					transactionLogic.applyConfirmed(
						validTransaction,
						dummyBlock,
						sender,
						async () => {
							accountModule.getAccount(
								{ publicKey: validTransaction.senderPublicKey },
								(err, accountAfter) => {
									expect(err).to.not.exist;
									const balanceAfter = new Bignum(
										accountAfter.balance.toString()
									);

									expect(err).to.not.exist;
									expect(balanceAfter.plus(amount).toString()).to.equal(
										balanceBefore.toString()
									);
									undoConfirmedTransaction(validTransaction, sender, done);
								}
							);
						}
					);
				}
			);
		});
	});

	describe('undoConfirmed', () => {
		const dummyBlock = {
			id: '9314232245035524467',
			height: 1,
		};

		function applyConfirmedTransaction(transaction, senderArg, done) {
			transactionLogic.applyConfirmed(transaction, dummyBlock, senderArg, done);
		}

		it('should throw an error with no param', async () =>
			expect(transactionLogic.undoConfirmed).to.throw());

		it('should not update sender balance when transaction is invalid', done => {
			const transaction = _.cloneDeep(validTransaction);
			const amount = new Bignum(transaction.amount.toString()).plus(
				transaction.fee.toString()
			);
			delete transaction.recipientId;

			accountModule.getAccount(
				{ publicKey: transaction.senderPublicKey },
				(_err, accountBefore) => {
					const balanceBefore = new Bignum(accountBefore.balance.toString());

					transactionLogic.undoConfirmed(
						transaction,
						dummyBlock,
						sender,
						async () => {
							accountModule.getAccount(
								{ publicKey: transaction.senderPublicKey },
								(err, accountAfter) => {
									expect(err).to.not.exist;
									const balanceAfter = new Bignum(
										accountAfter.balance.toString()
									);

									expect(
										balanceBefore.plus(amount.multipliedBy(2)).toString()
									).to.not.equal(balanceAfter.toString());
									expect(balanceBefore.toString()).to.equal(
										balanceAfter.toString()
									);
									done();
								}
							);
						}
					);
				}
			);
		});

		it('should be okay with valid params', done => {
			const transaction = validTransaction;
			const amount = new Bignum(transaction.amount.toString()).plus(
				transaction.fee.toString()
			);

			accountModule.getAccount(
				{ publicKey: validTransaction.senderPublicKey },
				(_err, accountBefore) => {
					const balanceBefore = new Bignum(accountBefore.balance.toString());

					transactionLogic.undoConfirmed(
						transaction,
						dummyBlock,
						sender,
						async () => {
							accountModule.getAccount(
								{ publicKey: transaction.senderPublicKey },
								(err, accountAfter) => {
									expect(err).to.not.exist;
									const balanceAfter = new Bignum(
										accountAfter.balance.toString()
									);

									expect(balanceBefore.plus(amount).toString()).to.equal(
										balanceAfter.toString()
									);
									applyConfirmedTransaction(transaction, sender, done);
								}
							);
						}
					);
				}
			);
		});
	});

	describe('applyUnconfirmed', () => {
		function undoUnconfirmedTransaction(transaction, senderArg, done) {
			transactionLogic.undoUnconfirmed(transaction, senderArg, done);
		}

		it('should throw an error with no param', async () =>
			expect(() => {
				transactionLogic.applyUnconfirmed();
			}).to.throw());

		it('should be okay with valid params', done => {
			const transaction = validTransaction;
			transactionLogic.applyUnconfirmed(transaction, sender, done);
		});

		it('should return error on if balance is low', done => {
			const transaction = _.cloneDeep(validTransaction);
			transaction.amount = new Bignum('9850458911801908');

			transactionLogic.applyUnconfirmed(transaction, sender, err => {
				expect(err).to.include('Account does not have enough ');
				done();
			});
		});

		it('should okay for valid params', done => {
			transactionLogic.applyUnconfirmed(validTransaction, sender, err => {
				expect(err).to.not.exist;
				undoUnconfirmedTransaction(validTransaction, sender, done);
			});
		});
	});

	describe('undoUnconfirmed', () => {
		function applyUnconfirmedTransaction(transaction, senderArg, done) {
			transactionLogic.applyUnconfirmed(transaction, senderArg, done);
		}

		it('should throw an error with no param', async () =>
			expect(transactionLogic.undoUnconfirmed).to.throw());

		it('should be okay with valid params', done => {
			transactionLogic.undoUnconfirmed(validTransaction, sender, err => {
				expect(err).to.not.exist;
				applyUnconfirmedTransaction(validTransaction, sender, done);
			});
		});
	});

	describe('afterSave', () => {
		it('should throw an error with no param', async () =>
			expect(transactionLogic.afterSave).to.throw());

		it('should invoke the passed callback', done => {
			transactionLogic.afterSave(validTransaction, done);
		});
	});

	describe('objectNormalize', () => {
		it('should throw an error with no param', async () =>
			expect(transactionLogic.objectNormalize).to.throw());

		it('should remove keys with null or undefined attribute', async () => {
			const transaction = _.cloneDeep(validTransaction);
			transaction.recipientId = null;

			return expect(
				_.keys(transactionLogic.objectNormalize(transaction))
			).to.not.include('recipientId');
		});

		it('should convert amount and fee to bignumber when values are null', async () => {
			const transaction = _.cloneDeep(validTransaction);
			transaction.amount = null;
			transaction.fee = null;

			const { amount, fee } = transactionLogic.objectNormalize(transaction);
			expect(amount).to.be.an.instanceOf(Bignum);
			return expect(fee).to.be.an.instanceOf(Bignum);
		});

		it('should convert amount and fee to bignumber when values are undefined', async () => {
			const transaction = _.cloneDeep(validTransaction);
			transaction.amount = undefined;
			transaction.fee = undefined;

			const { amount, fee } = transactionLogic.objectNormalize(transaction);
			expect(amount).to.be.an.instanceOf(Bignum);
			return expect(fee).to.be.an.instanceOf(Bignum);
		});

		it('should not remove any keys with valid entries', async () =>
			expect(
				_.keys(transactionLogic.objectNormalize(validTransaction))
			).to.have.length(12));

		it('should not remove data field after normalization', async () => {
			const transaction = _.cloneDeep(validTransaction);
			transaction.asset = {
				data: '123',
			};
			const normalizedTransaction = transactionLogic.objectNormalize(
				transaction
			);

			return expect(normalizedTransaction)
				.to.have.property('asset')
				.which.is.eql(transaction.asset);
		});

		it('should throw error for invalid schema types', async () => {
			const transaction = _.cloneDeep(validTransaction);
			transaction.amount = 'Invalid value';
			transaction.data = 124;

			return expect(() => {
				transactionLogic.objectNormalize(transaction);
			}).to.throw();
		});

		it('should not throw for recipient address 0L', async () => {
			const transaction = _.cloneDeep(validTransaction);
			transaction.recipientId = '0L';
			return expect(() => {
				transactionLogic.objectNormalize(transaction);
			}).not.to.throw();
		});

		it('should throw for recipient address with leading 0s', async () => {
			const transaction = _.cloneDeep(validTransaction);
			transaction.recipientId = '0123L';
			return expect(() => {
				transactionLogic.objectNormalize(transaction);
			}).to.throw(
				"Failed to validate transaction schema: Object didn't pass validation for format address: 0123L"
			);
		});

		describe('recipientId with leading zeros', () => {
			afterEach(done => {
				exceptions.recipientLeadingZero = {};
				done();
			});

			it('should handle legacy transactions', async () => {
				const transactionWithLeadingZero = _.cloneDeep(validTransaction);
				transactionWithLeadingZero.recipientId = `0${
					validTransaction.recipientId
				}`;
				exceptions.recipientLeadingZero[transactionWithLeadingZero.id] = `0${
					validTransaction.recipientId
				}`;

				return expect(() => {
					transactionLogic.objectNormalize(transactionWithLeadingZero);
				}).to.not.throw('');
			});

			it('should throw error', async () => {
				const transactionWithLeadingZero = _.cloneDeep(validTransaction);
				transactionWithLeadingZero.recipientId = `0${
					validTransaction.recipientId
				}`;

				return expect(() => {
					transactionLogic.objectNormalize(transactionWithLeadingZero);
				}).to.not.throw(
					`Failed to validate transaction schema: Object didn't pass validation for format address: ${
						validTransaction.recipientId
					}`
				);
			});
		});

		describe('recipientId exceeding uint64 range', () => {
			afterEach(done => {
				exceptions.recipientExceedingUint64 = {};
				done();
			});

			it('should throw for recipient address exceeding uint64 range', async () => {
				const transaction = _.cloneDeep(validTransaction);
				transaction.recipientId = '18446744073709551616L';
				return expect(() => {
					transactionLogic.objectNormalize(transaction);
				}).to.throw(
					"Failed to validate transaction schema: Object didn't pass validation for format address: 18446744073709551616L"
				);
			});

			it('should handle legacy transactions with recipient exceeding uint64 property', async () => {
				const withRecipientExceedingUint64 = _.cloneDeep(validTransaction);
				withRecipientExceedingUint64.recipientId = '44444444444444444444L';
				exceptions.recipientExceedingUint64[withRecipientExceedingUint64.id] =
					'44444444444444444444L';

				return expect(() => {
					transactionLogic.objectNormalize(withRecipientExceedingUint64);
				}).to.not.throw('');
			});
		});
	});

	describe('dbRead', () => {
		it('should throw an error with no param', async () =>
			expect(transactionLogic.dbRead).to.throw());

		it('should return transaction object with data field', async () => {
			const rawTransactionClone = _.cloneDeep(rawTransaction);
			const transactionFromDb = transactionLogic.dbRead(rawTransactionClone);

			expect(transactionFromDb).to.be.an('object');
			return expect(transactionFromDb.asset).to.have.property('data');
		});

		it('should return null if id field is not present', async () => {
			const rawTransactionClone = _.cloneDeep(rawTransaction);
			delete rawTransactionClone.t_id;

			const transaction = transactionLogic.dbRead(rawTransactionClone);

			return expect(transaction).to.be.a('null');
		});

		it('should return transaction object with correct fields', async () => {
			const transaction = transactionLogic.dbRead(rawTransaction);
			const expectedKeys = [
				'id',
				'height',
				'blockId',
				'type',
				'timestamp',
				'senderPublicKey',
				'requesterPublicKey',
				'senderId',
				'recipientId',
				'recipientPublicKey',
				'amount',
				'fee',
				'signature',
				'signSignature',
				'signatures',
				'confirmations',
				'asset',
			];

			expect(transaction).to.be.an('object');
			expect(transaction).to.have.keys(expectedKeys);
			return expect(transaction.asset)
				.to.have.property('data')
				.which.is.equal(rawTransaction.tf_data);
		});
	});

	describe('attachAssetType', () => {
		let appliedLogic;
		it('should attach VOTE transaction types', async () => {
			appliedLogic = transactionLogic.attachAssetType(
				TRANSACTION_TYPES.VOTE,
				new Vote({
					components: {
						logger: modulesLoader.logger,
					},
					schema: modulesLoader.scope.schema,
					logic: {
						account: accountLogic,
						transaction: transactionLogic,
					},
				})
			);
			return expect(appliedLogic).to.be.an.instanceof(Vote);
		});

		it('should attach SEND transaction types', async () => {
			appliedLogic = transactionLogic.attachAssetType(
				TRANSACTION_TYPES.SEND,
				new Transfer({
					components: {
						logger: modulesLoader.scope.components.logger,
					},
					schema: modulesLoader.scope.schema,
				})
			);
			return expect(appliedLogic).to.be.an.instanceof(Transfer);
		});

		it('should attach DELEGATE transaction types', async () => {
			appliedLogic = transactionLogic.attachAssetType(
				TRANSACTION_TYPES.DELEGATE,
				new Delegate({
					schema: modulesLoader.scope.schema,
				})
			);
			return expect(appliedLogic).to.be.an.instanceof(Delegate);
		});

		it('should attach SIGNATURE transaction types', async () => {
			appliedLogic = transactionLogic.attachAssetType(
				TRANSACTION_TYPES.SIGNATURE,
				new Signature({
					components: {
						logger: modulesLoader.logger,
					},
					schema: modulesLoader.scope.schema,
				})
			);
			return expect(appliedLogic).to.be.an.instanceof(Signature);
		});

		it('should attach MULTI transaction types', async () => {
			appliedLogic = transactionLogic.attachAssetType(
				TRANSACTION_TYPES.MULTI,
				new Multisignature({
					components: {
						logger: modulesLoader.logger,
					},
					logic: {},
					schema: modulesLoader.scope.schema,
				})
			);
			return expect(appliedLogic).to.be.an.instanceof(Multisignature);
		});

		it('should attach DAPP transaction types', async () => {
			appliedLogic = transactionLogic.attachAssetType(
				TRANSACTION_TYPES.DAPP,
				new Dapp({
					components: {
						storage: modulesLoader.storage,
						logger: modulesLoader.logger,
					},
					schema: modulesLoader.scope.schema,
				})
			);
			return expect(appliedLogic).to.be.an.instanceof(Dapp);
		});

		it('should attach IN_TRANSFER transaction types', async () => {
			appliedLogic = transactionLogic.attachAssetType(
				TRANSACTION_TYPES.IN_TRANSFER,
				new InTransfer({
					components: {
						storage: modulesLoader.storage,
					},
					schema: modulesLoader.scope.schema,
				})
			);
			return expect(appliedLogic).to.be.an.instanceof(InTransfer);
		});

		it('should attach OUT_TRANSFER transaction types', async () => {
			appliedLogic = transactionLogic.attachAssetType(
				TRANSACTION_TYPES.OUT_TRANSFER,
				new OutTransfer({
					components: {
						storage: modulesLoader.storage,
						logger: modulesLoader.logger,
					},
					schema: modulesLoader.scope.schema,
				})
			);
			return expect(appliedLogic).to.be.an.instanceof(OutTransfer);
		});

		it('should throw an error on invalid asset', async () =>
			expect(() => {
				const invalidAsset = {};
				transactionLogic.attachAssetType(-1, invalidAsset);
			}).to.throw('Invalid instance interface'));

		it('should throw an error with no param', async () =>
			expect(transactionLogic.attachAssetType).to.throw());
	});

	describe('reverse', () => {
		// eslint-disable-next-line mocha/no-pending-tests
		it('should reverse');
	});
});
