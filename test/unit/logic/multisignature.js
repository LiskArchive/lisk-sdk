'use strict';/*eslint*/

var node = require('./../../node.js');
var ed = require('../../../helpers/ed');
var crypto = require('crypto');
var async = require('async');

var rewire = require('rewire');
var sinon = require('sinon');

var chai = require('chai');
var expect = require('chai').expect;
var _  = require('lodash');
var transactionTypes = require('../../../helpers/transactionTypes');
var constants = require('../../../helpers/constants');
var DBSandbox = require('../../common/dbSandbox').DBSandbox;

var modulesLoader = require('../../common/modulesLoader');
var Transaction = require('../../../logic/transaction.js');
var AccountLogic = require('../../../logic/account.js');
var AccountModule = require('../../../modules/accounts.js');

var Multisignature = rewire('../../../logic/multisignature.js');
var slots = require('../../../helpers/slots.js');
var Diff = require('../../../helpers/diff.js');
var testData = require('./testData/multisignature.js');

var validPassword = testData.validPassword;
var validKeypair = testData.validKeypair;
var senderHash = testData.senderHash;
var senderKeypair = testData.senderKeypair;
var validSender = testData.validSender;
var validTransaction = testData.validTransaction;
var rawValidTransaction = testData.rawValidTransaction;
var validGetGensisResult = testData.validGetGensisResult;
var multiSigAccount1 = testData.multiSigAccount1;
var multiSigAccount2 = testData.multiSigAccount2;

describe('multisignature', function () {
	var transactionMock;
	// logic is singular, modules are plural
	var accountMock;
	var accountsMock;

	var dummyBlock;
	var multisignature;
	var transaction;
	var rawTransaction;
	var sender;

	beforeEach(function () {
		transactionMock = {
			verifySignature: sinon.stub().returns(1)
		};
		accountMock = {
			merge: sinon.mock().callsArg(2)
		};
		accountsMock = {
			generateAddressByPublicKey: sinon.stub().returns(node.lisk.crypto.getKeys(node.randomPassword()).publicKey),
			setAccountAndGet: sinon.stub().callsArg(1)
		};
		transaction = _.cloneDeep(validTransaction);
		rawTransaction = _.cloneDeep(rawValidTransaction);
		sender = _.cloneDeep(validSender);
		dummyBlock = {
			id: '9314232245035524467',
			height: 1
		};
		multisignature = new Multisignature(modulesLoader.scope.schema, modulesLoader.scope.network, transactionMock, accountMock, modulesLoader.logger);
		multisignature.bind(accountsMock);
	});

	afterEach(function () {
		accountMock.merge.reset();
		accountsMock.generateAddressByPublicKey.reset();
		accountsMock.setAccountAndGet.reset();
	});

	describe('constructor', function () {

		var library;

		beforeEach(function () {
			new Multisignature(modulesLoader.scope.schema, modulesLoader.scope.network, transactionMock, accountMock, modulesLoader.logger);
			library = Multisignature.__get__('library');
		});

		it('should attach schema to library variable', function () {
			expect(library.schema).to.eql(modulesLoader.scope.schema);
		});

		it('should attach network to library variable', function () {
			expect(library.network).to.eql(modulesLoader.scope.network);
		});

		it('should attach logger to library variable', function () {
			expect(library.logger).to.eql(modulesLoader.logger);
		});

		it('should attach logic.transaction to library variable', function () {
			expect(library.logic.transaction).to.eql(transactionMock);
		});

		it('should attach schema to library variable', function () {
			expect(library.logic.account).to.eql(accountMock);
		});
	});

	describe('bind', function () {

		describe('modules', function () {

			it('should assign accounts', function () {
				multisignature.bind(accountsMock);
				var modules = Multisignature.__get__('modules');

				expect(modules).to.eql({
					accounts: accountsMock
				});
			});
		});
	});

	describe('calculateFee', function () {

		it('should return correct fee based on formula for 1 keysgroup', function () {
			transaction.asset.multisignature.keysgroup = [
				'+' + node.lisk.crypto.getKeys(node.randomPassword()).publicKey
			];
			expect(multisignature.calculateFee(transaction).toString()).to.equal('1000000000');
		});


		it('should return correct fee based on formula for 4 keysgroup', function () {
			transaction.asset.multisignature.keysgroup = new Array(4).fill('+' + node.lisk.crypto.getKeys(node.randomPassword()).publicKey);

			expect(multisignature.calculateFee(transaction).toString()).to.equal('2500000000');
		});

		it('should return correct fee based on formula for 8 keysgroup', function () {
			transaction.asset.multisignature.keysgroup = new Array(8).fill('+' + node.lisk.crypto.getKeys(node.randomPassword()).publicKey);

			expect(multisignature.calculateFee(transaction).toString()).to.equal('4500000000');
		});

		it('should return correct fee based on formula for 16 keysgroup', function () {
			transaction.asset.multisignature.keysgroup = new Array(16).fill('+' + node.lisk.crypto.getKeys(node.randomPassword()).publicKey);

			expect(multisignature.calculateFee(transaction).toString()).to.equal('8500000000');
		});
	});

	describe('verify', function () {

		describe('from multisignature.verify tests', function () {

			it('should return error when min value is smaller than minimum acceptable value', function (done) {
				var min = constants.multisigConstraints.min.minimum - 1;
				var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '+' + multiSigAccount2.publicKey], 1, 1);
				transaction.asset.multisignature.min = min;

				multisignature.verify(transaction, node.gAccount, function (err) {
					expect(err).to.equal('Invalid multisignature min. Must be between 1 and 15');
					done();
				});
			});
		});

		it('should return error when min value is greater than maximum acceptable value', function (done) {
			var min = constants.multisigConstraints.min.maximum + 1;
			var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '+' + multiSigAccount2.publicKey], 1, min);

			multisignature.verify(transaction, node.gAccount, function (err) {
				expect(err).to.equal('Invalid multisignature min. Must be between 1 and 15');
				done();
			});
		});

		describe('when asset = undefined', function () {

			it('should call callback with error = "Invalid transaction asset"', function (done) {
				delete transaction.asset;

				multisignature.verify(transaction, sender, function (err) {
					expect(err).to.equal('Invalid transaction asset');
					done();
				});
			});
		});

		describe('when asset.multisignature = undefined', function () {

			it('should call callback with error = "Invalid transaction asset"', function (done) {
				delete transaction.asset.multisignature;

				multisignature.verify(transaction, sender, function (err) {
					expect(err).to.equal('Invalid transaction asset');
					done();
				});
			});
		});

		describe('when asset.multisignature = []', function () {

			it('should call callback with error = "Invalid multisignature keysgroup. Must not be empty"', function (done) {
				transaction.asset.multisignature.keysgroup = [];

				multisignature.verify(transaction, sender, function (err) {
					expect(err).to.equal('Invalid multisignature keysgroup. Must not be empty');
					done();
				});
			});
		});

		describe('when min <= 1', function () {

			it('should call callback with error = "Invalid multisignature min. Must be between 1 and 16"', function (done) {
				transaction.asset.multisignature.min = 0;

				multisignature.verify(transaction, sender, function (err) {
					expect(err).to.equal('Invalid multisignature min. Must be between 1 and 15');
					done();
				});
			});
		});

		describe('when min >= 16', function () {

			it('should call callback with error = "Invalid multisignature min. Must be between 1 and 15"', function (done) {
				transaction.asset.multisignature.min = 16;

				multisignature.verify(transaction, sender, function (err) {
					expect(err).to.equal('Invalid multisignature min. Must be between 1 and 15');
					done();
				});
			});
		});

		describe('when min = 2', function () {

			it('should call callback with error = null', function (done) {
				transaction.asset.multisignature.min = 2;

				multisignature.verify(transaction, sender, function (err) {
					expect(err).to.not.exist;
					done();
				});
			});
		});

		describe('when min = 15', function () {

			before(function () {
				transaction.asset.multisignature.min = 15;
				transaction.asset.keysgroup = _.map(new Array(16), function () {
					return '+' + node.randomAccount().publicKey;
				});
			});

			it('should call callback with error = null', function (done) {
				multisignature.verify(transaction, sender, function (err) {
					expect(err).to.not.exist;
					done();
				});
			});
		});

		describe('when lifetime < 1', function () {

			it('should call callback with error = "Invalid multisignature lifetime. Must be between 1 and 72"', function (done) {
				transaction.asset.multisignature.lifetime = 0;

				multisignature.verify(transaction, sender, function (err) {
					expect(err).to.equal('Invalid multisignature lifetime. Must be between 1 and 72');
					done();
				});
			});
		});

		describe('when lifetime > 72', function () {

			it('should call callback with error = "Invalid multisignature lifetime. Must be between 1 and 72"', function (done) {
				transaction.asset.multisignature.lifetime = 73;

				multisignature.verify(transaction, sender, function (err) {
					expect(err).to.equal('Invalid multisignature lifetime. Must be between 1 and 72');
					done();
				});
			});
		});

		describe('when sender has multisignature enbled', function () {

			it('should call callback with error = "Account already has multisignatures enabled"', function (done) {
				sender.multisignatures = [node.lisk.crypto.getKeys(node.randomPassword()).publicKey];

				multisignature.verify(transaction, sender, function (err) {
					expect(err).to.equal('Account already has multisignatures enabled');
					done();
				});
			});
		});

		describe('when keysgroup contains sender', function () {

			// check for case where we have a ready transaction - nit done; (reference confusion)
			it('should call callback with error = "Invalid multisignature keysgroup. Can not contain sender"', function (done) {
				transaction.asset.multisignature.keysgroup.push('+' + sender.publicKey);

				multisignature.verify(transaction, sender, function (err) {
					expect(err).to.equal('Invalid multisignature keysgroup. Can not contain sender');
					done();
				});
			});
		});

		describe('when keysgroup has an entry which does not start with + character', function () {

			it('should call callback with error = "Invalid math operator in multisignature keysgroup"', function (done) {
				transaction.asset.multisignature.keysgroup.push('-' + node.lisk.crypto.getKeys(node.randomPassword()).publicKey);

				multisignature.verify(transaction, node.gAccount, function (err) {
					expect(err).to.equal('Invalid math operator in multisignature keysgroup');
					done();
				});
			});
		});

		describe('when multisignature keysgroup has an entry which is null', function () {

			it('should call callback with error = "Invalid member in keysgroup"', function (done) {
				transaction.asset.multisignature.keysgroup.push(null);

				multisignature.verify(transaction, node.gAccount, function (err) {
					expect(err).to.equal('Invalid member in keysgroup');
					done();
				});
			});
		});

		describe('when multisignature keysgroup has an entry which is undefined', function () {

			it('should return error = "Invalid member in keysgroup"', function (done) {
				transaction.asset.multisignature.keysgroup.push(undefined);

				multisignature.verify(transaction, node.gAccount, function (err) {
					expect(err).to.equal('Invalid member in keysgroup');
					done();
				});
			});
		});

		describe('when multisignature keysgroup has an entry which is an integer', function () {

			it('should return error = "Invalid member in keysgroup"', function (done) {
				transaction.asset.multisignature.keysgroup.push(1);

				multisignature.verify(transaction, node.gAccount, function (err) {
					expect(err).to.equal('Invalid member in keysgroup');
					done();
				});
			});
		});

		describe('when multisignature keysgroup has an entry which is not an hex string', function () {

			it('should call callback with error = Invalid member in keysgroup', function (done) {
				transaction.asset.multisignature.keysgroup.push(1);

				multisignature.verify(transaction, node.gAccount, function (err) {
					expect(err).to.equal('Invalid member in keysgroup');
					done();
				});
			});
		});

		describe('when multisignature keysgroup has non unique elements', function () {

			it('should call callback with error = Encountered duplicate public key in multisignature keysgroup', function (done) {
				transaction.asset.multisignature.keysgroup.push(transaction.asset.multisignature.keysgroup[0]);

				multisignature.verify(transaction, node.gAccount, function (err) {
					expect(err).to.equal('Encountered duplicate public key in multisignature keysgroup');
					done();
				});
			});
		});

		it('should be okay for valid transaction', function (done) {
			multisignature.verify(transaction, sender, function (err, result) {
				expect(err).to.not.exist;
				expect(transaction).to.eql(result);
				done();
			});
		});
	});

	describe('process', function () {

		it('should call callback with error = null', function (done) {
			multisignature.process(transaction, sender, function (err) {
				expect(err).to.be.null;
				done();
			});
		});

		it('should call callback with result = transaction', function (done) {
			multisignature.process(transaction, sender, function (err, result) {
				expect(result).to.eql(transaction);
				done();
			});
		});
	});

	describe('getBytes', function () {

		describe('when transaction.asset.multisignature.keysgroup is undefined', function () {

			beforeEach(function () {
				transaction.asset.multisignature.keysgroup = undefined;
			});

			it('should throw', function () {
				expect(multisignature.getBytes.bind(null, transaction)).to.throw();
			});
		});

		describe('when transaction.asset.multisignature.keysgroup is a valid keysgroup', function () {

			it('should not throw', function () {
				expect(multisignature.getBytes.bind(null, transaction)).not.to.throw();
			});

			it('should get bytes of valid transaction', function () {
				var bytes = multisignature.getBytes(transaction);
				expect(bytes.toString('utf8')).to.equal('\u0002\u0002+bd6d0388dcc0b07ab2035689c60a78d3ebb27901c5a5ed9a07262eab1a2e9bd2+addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9');
				expect(bytes.length).to.equal(132);
			});

			it('should return result as a Buffer type', function () {
				expect(multisignature.getBytes(transaction)).to.be.instanceOf(Buffer);
			});
		});
	});

	describe('apply', function () {

		beforeEach(function (done) {
			accountMock.merge = sinon.stub().callsArg(2);
			multisignature.apply(transaction, dummyBlock, sender, done);
		});

		it('should set __private.unconfirmedSignatures[sender.address] = false', function () {
			var unconfirmedSignatures = Multisignature.__get__('__private.unconfirmedSignatures');
			expect(unconfirmedSignatures).to.contain.property(sender.address).equal(false);
		});

		it('should call library.logic.account.merge', function () {
			expect(accountMock.merge.calledOnce).to.be.true;
		});

		it('should call library.logic.account.merge with sender.address', function () {
			expect(accountMock.merge.calledWith(sender.address)).to.be.true;
		});

		it('should call library.logic.account.merge with expected params', function () {
			var expectedParams = {
				multisignatures: transaction.asset.multisignature.keysgroup,
				multimin: transaction.asset.multisignature.min,
				multilifetime: transaction.asset.multisignature.lifetime,
				blockId: dummyBlock.id,
				round: slots.calcRound(dummyBlock.height)
			};
			expect(accountMock.merge.args[0][1]).to.eql(expectedParams);
		});

		describe('when library.logic.account.merge fails', function () {

			beforeEach(function () {
				accountMock.merge = sinon.stub().callsArgWith(2, 'merge error');
			});

			it('should call callback with error', function () {
				multisignature.apply(transaction, dummyBlock, sender, function (err) {
					expect(err).not.to.be.empty;
				});
			});
		});

		describe('when library.logic.account.merge succeeds', function () {

			describe('for every keysgroup member', function () {

				validTransaction.asset.multisignature.keysgroup.forEach(function (member) {

					it('should call modules.accounts.generateAddressByPublicKey', function () {
						expect(accountsMock.generateAddressByPublicKey.callCount).to.equal(validTransaction.asset.multisignature.keysgroup.length);
					});

					it('should call modules.accounts.generateAddressByPublicKey with member.substring(1)', function () {
						expect(accountsMock.generateAddressByPublicKey.calledWith(member.substring(1))).to.be.true;
					});

					describe('when key and the address', function () {

						var key;
						var address;

						beforeEach(function () {
							key = member.substring(1);
							address = accountsMock.generateAddressByPublicKey(key);
						});

						it('should call library.logic.account.setAccountAndGet', function () {
							expect(accountsMock.setAccountAndGet.callCount).to.equal(validTransaction.asset.multisignature.keysgroup.length);
						});

						it('should call library.logic.account.setAccountAndGet with {address: address}', function () {
							expect(accountsMock.setAccountAndGet.calledWith(sinon.match({address: address}))).to.be.true;
						});

						it('should call library.logic.account.setAccountAndGet with sender.address', function () {
							expect(accountsMock.setAccountAndGet.calledWith(sinon.match({publicKey: key}))).to.be.true;
						});

						describe('when modules.accounts.setAccountAndGet fails', function () {

							beforeEach(function () {
								accountsMock.setAccountAndGet = sinon.stub().callsArgWith(1, 'mergeAccountAndGet error');
							});

							it('should call callback with error', function () {
								multisignature.apply(transaction, dummyBlock, sender, function (err) {
									expect(err).not.to.be.empty;
								});
							});
						});

						describe('when modules.accounts.mergeAccountAndGet succeeds', function () {

							it('should call callback with error = null', function () {
								multisignature.apply(transaction, dummyBlock, sender, function (err) {
									expect(err).to.be.null;
								});
							});

							it('should call callback with result = undefined', function () {
								multisignature.apply(transaction, dummyBlock, sender, function (err, res) {
									expect(res).to.be.undefined;
								});
							});
						});
					});
				});
			});
		});
	});

	it('undo', function () {

		beforeEach(function (done) {
			transaction = _.cloneDeep(validTransaction);
			accountMock.merge = sinon.stub().callsArg(2);
			multisignature.undo(transaction, dummyBlock, sender, done);
		});

		it('should set __private.unconfirmedSignatures[sender.address] = true', function () {
			var unconfirmedSignatures = Multisignature.__get__('__private.unconfirmedSignatures');
			expect(unconfirmedSignatures).to.contain.property(sender.address).equal(true);
		});

		it('should call library.logic.account.merge', function () {
			expect(accountMock.merge.calledOnce).to.be.true;
		});

		it('should call library.logic.account.merge with sender.address', function () {
			expect(accountMock.merge.calledWith(sender.address)).to.be.true;
		});

		it('should call library.logic.account.merge with expected params', function () {
			var expectedParams = {
				multisignatures: Diff.reverse(transaction.asset.multisignature.keysgroup),
				multimin: transaction.asset.multisignature.min,
				multilifetime: transaction.asset.multisignature.lifetime,
				blockId: dummyBlock.id,
				round: slots.calcRound(dummyBlock.height)
			};
			expect(accountMock.merge.args[0][1]).to.eql(expectedParams);
		});

		describe('when library.logic.account.merge fails', function () {

			beforeEach(function () {
				accountMock.merge = sinon.stub().callsArgWith(2, 'merge error');
			});

			it('should call callback with error', function () {
				multisignature.undo(transaction, dummyBlock, sender, function (err) {
					expect(err).not.to.be.empty;
				});
			});
		});

		describe('when library.logic.account.merge succeeds', function () {

			it('should call callback with error = null', function () {
				multisignature.apply(transaction, dummyBlock, sender, function (err) {
					expect(err).to.be.null;
				});
			});

			it('should call callback with result = undefined', function () {
				multisignature.apply(transaction, dummyBlock, sender, function (err, res) {
					expect(res).to.be.undefined;
				});
			});
		});
	});

	describe('applyUnconfirmed', function () {

		describe('when transaction is pending for confirmation', function () {

			beforeEach(function () {
				var unconfirmedSignatures = Multisignature.__get__('__private.unconfirmedSignatures');
				unconfirmedSignatures[sender.address] = true;
			});

			it('should call callback with error = "Signature on this account is pending confirmation"', function (done) {

				multisignature.applyUnconfirmed(transaction, sender, function (err) {
					expect(err).to.equal('Signature on this account is pending confirmation');
					done();
				});
			});
		});

		describe('when transaction is not pending confirmation', function () {

			beforeEach(function () {
				var unconfirmedSignatures = Multisignature.__get__('__private.unconfirmedSignatures');
				unconfirmedSignatures[sender.address] = false;
			});

			it('should set __private.unconfirmedSignatures[sender.address] = true', function (done) {
				var unconfirmedSignatures = Multisignature.__get__('__private.unconfirmedSignatures');
				multisignature.applyUnconfirmed(transaction, sender, function (err) {
					expect(unconfirmedSignatures).to.contain.property(sender.address).equal(true);
					done();
				});
			});

			it('should call library.logic.account.merge', function (done) {
				multisignature.applyUnconfirmed(transaction, sender, function (err) {
					expect(accountMock.merge.calledOnce).to.be.true;
					done();
				});
			});

			it('should call library.logic.account.merge with sender.address', function (done) {
				multisignature.applyUnconfirmed(transaction, sender, function (err) {
					expect(accountMock.merge.calledWith(sender.address)).to.be.true;
					done();
				});
			});

			it('should call library.logic.account.merge with expected params', function (done) {
				var expectedParams = {
					u_multisignatures: transaction.asset.multisignature.keysgroup,
					u_multimin: transaction.asset.multisignature.min,
					u_multilifetime: transaction.asset.multisignature.lifetime
				};
				multisignature.applyUnconfirmed(transaction, sender, function (err) {
					expect(accountMock.merge.args[0][1]).to.eql(expectedParams);
					done();
				});
			});

			describe('when library.logic.account.merge fails', function () {

				beforeEach(function () {
					accountMock.merge.callsArgWith(2, 'merge error');
				});

				afterEach(function () {
					accountMock.merge.reset();
				});

				it('should call callback with error = undefined', function (done) {
					multisignature.applyUnconfirmed(transaction, sender, function (err) {
						expect(err).to.not.exist;
						done();
					});
				});
			});

			describe('when library.logic.account.merge succeeds', function () {

				it('should call callback with error = null', function (done) {
					multisignature.applyUnconfirmed(transaction, sender, function (err) {
						expect(err).to.be.not.exist;
						done();
					});
				});

				it('should call callback with result = undefined', function (done) {
					multisignature.applyUnconfirmed(transaction, sender, function (err, res) {
						expect(res).to.be.undefined;
						done();
					});
				});
			});
		});
	});

	describe('undoUnconfirmed', function () {

		beforeEach(function (done) {
			accountMock.merge = sinon.stub().callsArg(2);
			multisignature.undoUnconfirmed(transaction, sender, done);
		});

		it('should set __private.unconfirmedSignatures[sender.address] = false', function () {
			var unconfirmedSignatures = Multisignature.__get__('__private.unconfirmedSignatures');
			expect(unconfirmedSignatures).to.contain.property(sender.address).equal(false);
		});

		it('should call library.logic.account.merge', function () {
			expect(accountMock.merge.calledOnce).to.be.true;
		});

		it('should call library.logic.account.merge with sender.address', function () {
			expect(accountMock.merge.calledWith(sender.address)).to.be.true;
		});

		it('should call library.logic.account.merge with expected params', function () {
			var expectedParams = {
				u_multisignatures: Diff.reverse(transaction.asset.multisignature.keysgroup),
				u_multimin: -transaction.asset.multisignature.min,
				u_multilifetime: -transaction.asset.multisignature.lifetime,
			};
			expect(accountMock.merge.args[0][1]).to.eql(expectedParams);
		});

		describe('when library.logic.account.merge fails', function () {

			beforeEach(function () {
				accountMock.merge = sinon.stub().callsArgWith(2, 'merge error');
			});

			it('should call callback with error', function () {
				multisignature.undo(transaction, dummyBlock, sender, function (err) {
					expect(err).not.to.be.empty;
				});
			});
		});

		describe('when library.logic.account.merge succeeds', function () {

			it('should call callback with error = null', function () {
				multisignature.apply(transaction, dummyBlock, sender, function (err) {
					expect(err).to.be.null;
				});
			});

			it('should call callback with result = undefined', function () {
				multisignature.apply(transaction, dummyBlock, sender, function (err, res) {
					expect(res).to.be.undefined;
				});
			});
		});
	});

	describe('objectNormalize', function () {

		describe('min', function () {

			it('should return error when value is not an integer', function () {
				var min = '2';
				var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '+' + multiSigAccount2.publicKey], 1, 2);
				transaction.asset.multisignature.min = min;

				expect(function () {
					multisignature.objectNormalize(transaction);
				}).to.throw('Failed to validate multisignature schema: Expected type integer but found type string');
			});

			it('should return error when value is a negative integer', function () {
				var min = -1;
				var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '+' + multiSigAccount2.publicKey], 1, 2);
				transaction.asset.multisignature.min = min;

				expect(function () {
					multisignature.objectNormalize(transaction);
				}).to.throw('Failed to validate multisignature schema: Value -1 is less than minimum 1');
			});

			it('should return error when value is smaller than minimum acceptable value', function () {
				var min = constants.multisigConstraints.min.minimum - 1;
				var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '+' + multiSigAccount2.publicKey], 1, min);

				expect(function () {
					multisignature.objectNormalize(transaction);
				}).to.throw('Failed to validate multisignature schema: Value 0 is less than minimum 1');
			});

			it('should return error when value is greater than maximum acceptable value', function () {
				var min = constants.multisigConstraints.min.maximum + 1;
				var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '-' + multiSigAccount2.publicKey], 1, min);

				expect(function () {
					multisignature.objectNormalize(transaction);
				}).to.throw('Failed to validate multisignature schema: Value 16 is greater than maximum 15');
			});

			it('should return error when value is an overflow number', function () {
				var min = Number.MAX_VALUE + 1;
				var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '-' + multiSigAccount2.publicKey], 1, 2);
				transaction.asset.multisignature.min = min;

				expect(function () {
					multisignature.objectNormalize(transaction);
				}).to.throw('Failed to validate multisignature schema: Value 1.7976931348623157e+308 is greater than maximum 15');
			});
		});

		describe('lifetime', function () {

			it('should return error when value is not an integer', function () {
				var lifetime = '2';
				var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '-' + multiSigAccount2.publicKey], 1, 2);
				transaction.asset.multisignature.lifetime = lifetime;

				expect(function () {
					multisignature.objectNormalize(transaction);
				}).to.throw('Failed to validate multisignature schema: Expected type integer but found type string');
			});

			it('should return error when value is smaller than minimum acceptable value', function () {
				var lifetime = node.constants.multisigConstraints.lifetime.minimum - 1;
				var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '-' + multiSigAccount2.publicKey], lifetime, 2);

				expect(function () {
					multisignature.objectNormalize(transaction);
				}).to.throw('Failed to validate multisignature schema: Value 0 is less than minimum 1');
			});

			it('should return error when value is greater than maximum acceptable value', function () {
				var lifetime = node.constants.multisigConstraints.lifetime.maximum + 1;
				var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '-' + multiSigAccount2.publicKey], lifetime, 2);

				expect(function () {
					multisignature.objectNormalize(transaction);
				}).to.throw('Failed to validate multisignature schema: Value 73 is greater than maximum 72');
			});

			it('should return error when value is an overflow number', function () {
				var lifetime = Number.MAX_VALUE;
				var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '-' + multiSigAccount2.publicKey], 1, 2);
				transaction.asset.multisignature.lifetime = lifetime;

				expect(function () {
					multisignature.objectNormalize(transaction);
				}).to.throw('Failed to validate multisignature schema: Value 1.7976931348623157e+308 is greater than maximum 72');
			});
		});

		describe('keysgroup', function () {

			it('should return error when it is not an array', function () {
				var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, [''], 1, 2);
				transaction.asset.multisignature.keysgroup = '';

				expect(function () {
					multisignature.objectNormalize(transaction);
				}).to.throw('Failed to validate multisignature schema: Expected type array but found type string');
			});

			it('should return error when array length is smaller than minimum acceptable value', function () {
				var keysgroup = [];
				var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, keysgroup, 1, 2);

				expect(function () {
					multisignature.objectNormalize(transaction);
				}).to.throw('Failed to validate multisignature schema: Array is too short (0), minimum 1');
			});

			it('should return error when array length is greater than maximum acceptable value', function () {
				var keysgroup = Array.apply(null, Array(constants.multisigConstraints.keysgroup.maxItems + 1)).map(function () {
					return '+' + node.lisk.crypto.getKeys(node.randomPassword()).publicKey;
				});
				var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, keysgroup, 1, 2);

				expect(function () {
					multisignature.objectNormalize(transaction);
				}).to.throw('Failed to validate multisignature schema: Array is too long (16), maximum 15');
			});
		});

		it('should return transaction when asset is valid', function () {
			var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, Array.apply(null, Array(10)).map(function () {
				return '+' + node.lisk.crypto.getKeys(node.randomPassword()).publicKey;
			}), 1, 2);

			expect(multisignature.objectNormalize(transaction)).to.eql(transaction);
		});

		it('should use the correct format to validate against', function () {
			var library = Multisignature.__get__('library');
			var schemaSpy = sinon.spy(library.schema, 'validate');
			multisignature.objectNormalize(transaction);
			expect(schemaSpy.calledOnce).to.equal(true);
			expect(schemaSpy.calledWithExactly(transaction.asset.multisignature, Multisignature.prototype.schema)).to.equal(true);
			schemaSpy.restore();
		});

		it('should return error asset schema is invalid', function () {
			transaction.asset.multisignature.min = -1;

			expect(function () {
				multisignature.objectNormalize(transaction);
			}).to.throw('Failed to validate multisignature schema: Value -1 is less than minimum 1');
		});

		it('should return transaction when asset is valid', function () {
			expect(multisignature.objectNormalize(transaction)).to.eql(transaction);
		});
	});

	describe('dbRead', function () {

		describe('when raw.m_keysgroup does not exist', function () {

			beforeEach(function () {
				delete rawTransaction.m_keysgroup;
			});

			it('should return null', function () {
				expect(multisignature.dbRead(rawTransaction)).to.eql(null);
			});
		});

		describe('when raw.m_keysgroup exists', function () {

			it('should return result containing multisignature', function () {
				expect(multisignature.dbRead(rawTransaction)).to.have.property('multisignature');
			});

			it('should return result containing multisignature.min = raw.m_min', function () {
				expect(multisignature.dbRead(rawTransaction)).to.have.nested.property('multisignature.min').equal(rawTransaction.m_min);
			});

			it('should return result containing multisignature.lifetime = raw.lifetime', function () {
				expect(multisignature.dbRead(rawTransaction)).to.have.nested.property('multisignature.lifetime').equal(rawTransaction.m_lifetime);
			});

			describe('when raw.m_keysgroup is not a string', function () {

				beforeEach(function () {
					rawTransaction.m_keysgroup = {};
				});

				it('should return result containing multisignature.keysgroup = []', function () {
					expect(multisignature.dbRead(rawTransaction)).to.have.nested.property('multisignature.keysgroup').eql([]);
				});
			});

			describe('when raw.m_keysgroup = "a,b,c"', function () {

				beforeEach(function () {
					rawTransaction.m_keysgroup = 'a,b,c';
				});

				it('should return result containing multisignature.keysgroup = ["a", "b", "c"]', function () {
					expect(multisignature.dbRead(rawTransaction)).to.have.nested.property('multisignature.keysgroup').eql(['a', 'b', 'c']);
				});
			});
		});
	});

	describe('dbSave', function () {

		var dbSaveResult;

		beforeEach(function () {
			dbSaveResult = multisignature.dbSave(transaction);
		});

		it('should return result containing table = "multisignatures"', function () {
			expect(dbSaveResult).to.have.property('table').equal('multisignatures');
		});

		it('should return result containing fields = ["min", "lifetime", "keysgroup", "transactionId"]', function () {
			expect(dbSaveResult).to.have.property('fields').eql(['min', 'lifetime', 'keysgroup', 'transactionId']);
		});

		it('should return result containing values', function () {
			expect(dbSaveResult).to.have.property('values');
		});

		it('should return result containing values.min = transaction.asset.multisignature.min', function () {
			expect(dbSaveResult).to.have.nested.property('values.min').equal(transaction.asset.multisignature.min);
		});

		it('should return result containing values.lifetime = transaction.asset.multisignature.lifetime', function () {
			expect(dbSaveResult).to.have.nested.property('values.lifetime').equal(transaction.asset.multisignature.lifetime);
		});

		it('should return result containing values.keysgroup equal joined keysgroup as string', function () {
			expect(dbSaveResult).to.have.nested.property('values.keysgroup').equal(transaction.asset.multisignature.keysgroup.join(','));
		});

		it('should return result containing values.transactionId = transaction.id', function () {
			expect(dbSaveResult).to.have.nested.property('values.transactionId').equal(transaction.id);
		});
	});

	describe('ready', function () {

		it('should return true for single signature transaction', function () {
			expect(multisignature.ready(transaction, sender)).to.equal(true);
		});

		it('should return false for multi signature transaction with less signatures', function () {
			sender.multisignatures = [validKeypair.publicKey.toString('hex')];

			expect(multisignature.ready(transaction, sender)).to.equal(false);
		});

		it('should return true for multi signature transaction with alteast min signatures', function () {
			sender.multisignatures = [validKeypair.publicKey.toString('hex')];
			sender.multimin = 1;

			delete transaction.signature;
			// Not really correct signature, but we are not testing that over here
			transaction.signature = crypto.randomBytes(64).toString('hex');;
			transaction.signatures = [crypto.randomBytes(64).toString('hex')];

			expect(multisignature.ready(transaction, sender)).to.equal(true);
		});
	});
});
