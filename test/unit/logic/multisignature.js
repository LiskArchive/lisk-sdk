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

var modulesLoader = require('../../common/initModule').modulesLoader;
var Transaction = require('../../../logic/transaction.js');
var AccountLogic = require('../../../logic/account.js');
var AccountModule = require('../../../modules/accounts.js');

var Multisignature = rewire('../../../logic/multisignature.js');
var slots = require('../../../helpers/slots.js');
var Diff = require('../../../helpers/diff.js');

var validPassword = 'robust weapon course unknown head trial pencil latin acid';
var validKeypair = ed.makeKeypair(crypto.createHash('sha256').update(validPassword, 'utf8').digest());

var validSender = {
	address: '16313739661670634666L',
	publicKey: 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	password: 'wagon stock borrow episode laundry kitten salute link globe zero feed marble',
	balance: '10000000000000000'
};

var senderHash = crypto.createHash('sha256').update(validSender.password, 'utf8').digest();
var senderKeypair = ed.makeKeypair(senderHash);

var multiSigAccount1 = {
	balance: '0',
	password: 'jcja4vxibnw5dayk3xr',
	secondPassword: '0j64m005jyjj37bpdgqfr',
	username: 'LP',
	publicKey: 'bd6d0388dcc0b07ab2035689c60a78d3ebb27901c5a5ed9a07262eab1a2e9bd2',
	address: '5936324907841470379L'
};

var multiSigAccount2 = {
	address: '10881167371402274308L',
	publicKey: 'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
	password: 'actress route auction pudding shiver crater forum liquid blouse imitate seven front',
	balance: '0',
	delegateName: 'genesis_100'
};

var validTransaction = {
	id: '10004093306508192097',
	height: 2967,
	blockId: '16880210663552206127',
	type: 4,
	timestamp: 39547828,
	senderPublicKey: 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	senderId: '16313739661670634666L',
	recipientId: null,
	recipientPublicKey: null,
	amount: 0,
	fee: 1500000000,
	signature: 'c66a726defca0fcdb5978292e4c999d37ba08dfa9ea0796de04e57f48f77489f3868754fc208c42ac957e259494040e61b16ee7a8d715eb198bedf963dc18907',
	signatures: [
		'02eee0660459c36916c3c230e48cd7bec84b9ebe30049202a85d950bd36988ed46f313bc43b8240bd3886d4eb0571253d6615aae14df0a97cf8d5420f491aa0a',
		'a77e0f0a6e3db16542cf26268070a1a5bb69f6b90e855943c9cf8f3cde22c6c10e43e8443b33722973ebe7de6f6abcfb1792cd50c5082c66805c5ad9c486c108'
	],
	confirmations: 3,
	asset: {
		multisignature: {
			min: 2,
			lifetime: 2,
			keysgroup: [
				'+bd6d0388dcc0b07ab2035689c60a78d3ebb27901c5a5ed9a07262eab1a2e9bd2',
				'+addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9'
			]
		}
	}
};

var rawValidTransaction = {
	t_id: '10004093306508192097',
	b_height: 2967,
	t_blockId: '16880210663552206127',
	t_type: 4,
	t_timestamp: 39547828,
	t_senderPublicKey: 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	m_recipientPublicKey: null,
	t_senderId: '16313739661670634666L',
	t_recipientId: null,
	t_amount: '0',
	t_fee: '1500000000',
	t_signature: 'c66a726defca0fcdb5978292e4c999d37ba08dfa9ea0796de04e57f48f77489f3868754fc208c42ac957e259494040e61b16ee7a8d715eb198bedf963dc18907',
	t_SignSignature: null,
	t_signatures: '02eee0660459c36916c3c230e48cd7bec84b9ebe30049202a85d950bd36988ed46f313bc43b8240bd3886d4eb0571253d6615aae14df0a97cf8d5420f491aa0a,a77e0f0a6e3db16542cf26268070a1a5bb69f6b90e855943c9cf8f3cde22c6c10e43e8443b33722973ebe7de6f6abcfb1792cd50c5082c66805c5ad9c486c108',
	confirmations: 11,
	m_min: 2,
	m_lifetime: 2,
	m_keysgroup: '+bd6d0388dcc0b07ab2035689c60a78d3ebb27901c5a5ed9a07262eab1a2e9bd2,+addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9'
};

describe('multisignature', function () {
	var transactionMock;
	// logic is singular, modules are plural
	var accountMock;
	var accountsMock;

	var dummyBlock;
	var multisignature;
	var trs;
	var rawTrs;
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
		trs = _.cloneDeep(validTransaction);
		rawTrs = _.cloneDeep(rawValidTransaction);
		sender = _.cloneDeep(validSender);
		dummyBlock = {
			id: '9314232245035524467',
			height: 1
		};
		multisignature = new Multisignature(modulesLoader.scope.schema, modulesLoader.scope.network, transactionMock, accountMock, modulesLoader.logger);
		multisignature.bind(accountsMock);
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
			trs.asset.multisignature.keysgroup = [
				'+' + node.lisk.crypto.getKeys(node.randomPassword()).publicKey
			];
			expect(multisignature.calculateFee(trs).toString()).to.equal('1000000000');
		});


		it('should return correct fee based on formula for 4 keysgroup', function () {
			trs.asset.multisignature.keysgroup = new Array(4).fill('+' + node.lisk.crypto.getKeys(node.randomPassword()).publicKey);

			expect(multisignature.calculateFee(trs).toString()).to.equal('2500000000');
		});

		it('should return correct fee based on formula for 8 keysgroup', function () {
			trs.asset.multisignature.keysgroup = new Array(8).fill('+' + node.lisk.crypto.getKeys(node.randomPassword()).publicKey);

			expect(multisignature.calculateFee(trs).toString()).to.equal('4500000000');
		});

		it('should return correct fee based on formula for 16 keysgroup', function () {
			trs.asset.multisignature.keysgroup = new Array(16).fill('+' + node.lisk.crypto.getKeys(node.randomPassword()).publicKey);

			expect(multisignature.calculateFee(trs).toString()).to.equal('8500000000');
		});
	});

	describe('verify', function () {

		describe('from multisignature.verify tests', function () {

			it('should return error when min value is smaller than minimum acceptable value', function (done) {
				var min = constants.multisigConstraints.min.minimum - 1;
				var trs	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '+' + multiSigAccount2.publicKey], 1, 1);
				trs.asset.multisignature.min = min;

				multisignature.verify(trs, node.gAccount, function (err) {
					expect(err).to.equal('Invalid multisignature min. Must be between 1 and 15');
					done();
				});
			});
		});

		it('should return error when min value is greater than maximum acceptable value', function (done) {
			var min = constants.multisigConstraints.min.maximum + 1;
			var trs	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '+' + multiSigAccount2.publicKey], 1, min);

			multisignature.verify(trs, node.gAccount, function (err) {
				expect(err).to.equal('Invalid multisignature min. Must be between 1 and 15');
				done();
			});
		});

		describe('when asset = undefined', function () {

			it('should call callback with error = "Invalid transaction asset"', function (done) {
				delete trs.asset;

				multisignature.verify(trs, sender, function (err) {
					expect(err).to.equal('Invalid transaction asset');
					done();
				});
			});
		});

		describe('when asset.multisignature = undefined', function () {

			it('should call callback with error = "Invalid transaction asset"', function (done) {
				delete trs.asset.multisignature;

				multisignature.verify(trs, sender, function (err) {
					expect(err).to.equal('Invalid transaction asset');
					done();
				});
			});
		});

		describe('when asset.multisignature = []', function () {

			it('should call callback with error = "Invalid multisignature keysgroup. Must not be empty"', function (done) {
				trs.asset.multisignature.keysgroup = [];

				multisignature.verify(trs, sender, function (err) {
					expect(err).to.equal('Invalid multisignature keysgroup. Must not be empty');
					done();
				});
			});
		});

		describe('when min <= 1', function () {

			it('should call callback with error = "Invalid multisignature min. Must be between 1 and 16"', function (done) {
				trs.asset.multisignature.min = 0;

				multisignature.verify(trs, sender, function (err) {
					expect(err).to.equal('Invalid multisignature min. Must be between 1 and 15');
					done();
				});
			});
		});

		describe('when min >= 16', function () {

			it('should call callback with error = "Invalid multisignature min. Must be between 1 and 15"', function (done) {
				trs.asset.multisignature.min = 16;

				multisignature.verify(trs, sender, function (err) {
					expect(err).to.equal('Invalid multisignature min. Must be between 1 and 15');
					done();
				});
			});
		});

		describe('when lifetime < 1', function () {

			it('should call callback with error = "Invalid multisignature lifetime. Must be between 1 and 72"', function (done) {
				trs.asset.multisignature.lifetime = 0;

				multisignature.verify(trs, sender, function (err) {
					expect(err).to.equal('Invalid multisignature lifetime. Must be between 1 and 72');
					done();
				});
			});
		});

		describe('when lifetime > 72', function () {

			it('should call callback with error = "Invalid multisignature lifetime. Must be between 1 and 72"', function (done) {
				trs.asset.multisignature.lifetime = 73;

				multisignature.verify(trs, sender, function (err) {
					expect(err).to.equal('Invalid multisignature lifetime. Must be between 1 and 72');
					done();
				});
			});
		});

		describe('when sender has multisignature enbled', function () {

			it('should call callback with error = "Account already has multisignatures enabled"', function (done) {
				sender.multisignatures = [node.lisk.crypto.getKeys(node.randomPassword()).publicKey];

				multisignature.verify(trs, sender, function (err) {
					expect(err).to.equal('Account already has multisignatures enabled');
					done();
				});
			});
		});

		describe('when keysgroup contains sender', function () {

			// check for case where we have a ready transaction - nit done; (reference confusion)
			it('should call callback with error = "Invalid multisignature keysgroup. Can not contain sender"', function (done) {
				trs.asset.multisignature.keysgroup.push('+' + sender.publicKey);

				multisignature.verify(trs, sender, function (err) {
					expect(err).to.equal('Invalid multisignature keysgroup. Can not contain sender');
					done();
				});
			});
		});

		describe('when keysgroup has an entry which does not start with + character', function () {

			it('should call callback with error = "Invalid math operator in multisignature keysgroup"', function (done) {
				trs.asset.multisignature.keysgroup.push('-' + node.lisk.crypto.getKeys(node.randomPassword()).publicKey);

				multisignature.verify(trs, node.gAccount, function (err, trs) {
					expect(err).to.equal('Invalid math operator in multisignature keysgroup');
					done();
				});
			});
		});

		describe('when multisignature keysgroup has an entry which is null', function () {

			it('should call callback with error = "Invalid member in keysgroup"', function (done) {
				trs.asset.multisignature.keysgroup.push(null);

				multisignature.verify(trs, node.gAccount, function (err, trs) {
					expect(err).to.equal('Invalid member in keysgroup');
					done();
				});
			});
		});

		describe('when multisignature keysgroup has an entry which is undefined', function () {

			it('should return error = "Invalid member in keysgroup"', function (done) {
				trs.asset.multisignature.keysgroup.push(undefined);

				multisignature.verify(trs, node.gAccount, function (err, trs) {
					expect(err).to.equal('Invalid member in keysgroup');
					done();
				});
			});
		});

		describe('when multisignature keysgroup has an entry which is an integer', function () { 

			it('should return error = "Invalid member in keysgroup"', function (done) {
				trs.asset.multisignature.keysgroup.push(1);

				multisignature.verify(trs, node.gAccount, function (err, trs) {
					expect(err).to.equal('Invalid member in keysgroup');
					done();
				});
			});
		});

		describe('when multisignature keysgroup has an entry which is not an hex string', function () {

			it('should call callback with error = Invalid member in keysgroup', function (done) {
				trs.asset.multisignature.keysgroup.push(1);

				multisignature.verify(trs, node.gAccount, function (err, trs) {
					expect(err).to.equal('Invalid member in keysgroup');
					done();
				});
			});
		});

		describe('when multisignature keysgroup has non unique elements', function () {

			it('should call callback with error = Encountered duplicate public key in multisignature keysgroup', function (done) {
				trs.asset.multisignature.keysgroup.push(trs.asset.multisignature.keysgroup[0]);

				multisignature.verify(trs, node.gAccount, function (err, trs) {
					expect(err).to.equal('Encountered duplicate public key in multisignature keysgroup');
					done();
				});
			});
		});

		it('should be okay for valid transaction', function (done) {
			multisignature.verify(trs, sender, function (err, trs) {
				expect(err).to.not.exist;
				expect(trs).to.eql(trs);
				done();
			});
		});
	});

	describe('process', function () {

		it('should call callback with error = null', function (done) {
			multisignature.process(trs, sender, function (err) {
				expect(err).to.be.null;
				done();
			});
		});

		it('should call callback with result = transaction', function (done) {
			multisignature.process(trs, sender, function (err, result) {
				expect(result).to.eql(trs);
				done();
			});
		});
	});

	describe('getBytes', function () {

		describe('when trs.asset.multisignature.keysgroup is undefined', function () {

			beforeEach(function () {
				trs.asset.multisignature.keysgroup = undefined;
			});

			it('should throw', function () {
				expect(multisignature.getBytes.bind(null, trs)).to.throw;
			});
		});

		describe('when trs.asset.multisignature.keysgroup is a valid keysgroup', function () {

			it('should not throw', function () {
				expect(multisignature.getBytes.bind(null, trs)).not.to.throw;
			});

			it('should get bytes of valid transaction', function () {
				var bytes = multisignature.getBytes(trs);
				expect(bytes.toString('utf8')).to.equal('\u0002\u0002+bd6d0388dcc0b07ab2035689c60a78d3ebb27901c5a5ed9a07262eab1a2e9bd2+addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9');
				expect(bytes.length).to.equal(132);
			});

			it('should return result as a Buffer type', function () {
				expect(multisignature.getBytes(trs)).to.be.instanceOf(Buffer);
			});
		});
	});

	describe('apply', function () {

		beforeEach(function (done) {
			accountMock.merge = sinon.stub().callsArg(2);
			multisignature.apply(trs, dummyBlock, sender, done);
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

		it('should call library.logic.account.merge with valid params', function () {
			var expectedParams = {
				multisignatures: trs.asset.multisignature.keysgroup,
				multimin: trs.asset.multisignature.min,
				multilifetime: trs.asset.multisignature.lifetime,
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
				multisignature.apply(trs, dummyBlock, sender, function (err) {
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
								multisignature.apply(trs, dummyBlock, sender, function (err) {
									expect(err).not.to.be.empty;
								});
							});
						});

						describe('when modules.accounts.mergeAccountAndGet succeeds', function () {

							it('should call callback with error = null', function () {
								multisignature.apply(trs, dummyBlock, sender, function (err) {
									expect(err).to.be.null;
								});
							});

							it('should call callback with result = undefined', function () {
								multisignature.apply(trs, dummyBlock, sender, function (err, res) {
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

		it('should update private unconfirmed signature of sender', function (done) {
			accountMock.merge.withArgs(sinon.match.any, sinon.match.any).yields(null);

			accountsMock.generateAddressByPublicKey.exactly(trs.asset.multisignature.keysgroup.length).returns(node.lisk.crypto.getKeys(node.randomPassword()).publicKey);

			accountsMock.setAccountAndGet.exactly(trs.asset.multisignature.keysgroup.length).yields(null);
			multisignature.undo(trs, dummyBlock, sender, function () {
				var unconfirmedSignatures = Multisignature.__get__('__private.unconfirmedSignatures');
				expect(unconfirmedSignatures[sender.address]).to.equal(true);
				accountMock.merge.verify();
				accountsMock.generateAddressByPublicKey.verify();
				accountsMock.setAccountAndGet.verify();
				done();
			});
		});

		it('should call accounts changes with correct parameters', function (done) {
			accountMock.merge.once().withArgs(sender.address, {
				multisignatures: Diff.reverse(trs.asset.multisignature.keysgroup),
				multimin: trs.asset.multisignature.min,
				multilifetime: trs.asset.multisignature.lifetime,
				blockId: dummyBlock.id,
				round: slots.calcRound(dummyBlock.height)
			}).yields(null);

			accountsMock.generateAddressByPublicKey.exactly(trs.asset.multisignature.keysgroup.length).returns(node.lisk.crypto.getKeys(node.randomPassword()).publicKey);

			accountsMock.setAccountAndGet.exactly(trs.asset.multisignature.keysgroup.length).yields(null);
			multisignature.undo(trs, dummyBlock, sender, function () {
				accountMock.merge.verify();
				accountsMock.generateAddressByPublicKey.verify();
				accountsMock.setAccountAndGet.verify();
				done();
			});
		});
	});

	it('applyUnconfirmed', function () {

		it('should return error when transaction is already pending confirmation', function (done) {
			Multisignature.__set__('__private.unconfirmedSignatures', true);

			multisignature.applyUnconfirmed(trs, sender, function (err) {
				expect(err).to.equal('Signature on this account is pending confirmation');
				done();
			});
		});

		it('should update private unconfirmed signature status of sender', function (done) {
			accountMock.merge.withArgs(sinon.match.any, sinon.match.any).yields(null);
			Multisignature.__set__('__private.unconfirmedSignatures', false);

			multisignature.applyUnconfirmed(trs, sender, function () {
				var unconfirmedSignatures = Multisignature.__get__('__private.unconfirmedSignatures');
				expect(unconfirmedSignatures[sender.address]).to.equal(true);
				accountMock.merge.verify();
				done();
			});
		});

		it('should call the account.merge with correct params', function (done) {
			accountMock.merge.withArgs(sender.address, {
				u_multisignatures: trs.asset.multisignature.keysgroup,
				u_multimin: trs.asset.multisignature.min,
				u_multilifetime: trs.asset.multisignature.lifetime
			}).yields(null);

			multisignature.applyUnconfirmed(trs, sender, function () {
				accountMock.merge.verify();
				done();
			});
		});
	});

	describe('undoUnconfirmed', function () {

		it('should update private unconfirmed signature status of sender', function (done) {
			accountMock.merge.withArgs(sinon.match.any, sinon.match.any).yields(null);
			Multisignature.__set__('__private.unconfirmedSignatures', {[sender.address]: true});

			multisignature.undoUnconfirmed(trs, sender, function () {
				var unconfirmedSignatures = Multisignature.__get__('__private.unconfirmedSignatures');
				expect(unconfirmedSignatures[sender.address]).to.equal(false);
				accountMock.merge.verify();
				done();
			});
		});

		it('should return error when multisignature keysgroup has an entry which does not start with + character', function (done) {
			var trs	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '-' + multiSigAccount2.publicKey], 1, 2);
			trs.senderId = node.gAccount.address;

			multisignature.verify(trs, node.gAccount, function (err, trs) {
				expect(err).to.equal('Invalid math operator in multisignature keysgroup');
				done();
			});
		});

		it('should return error when multisignature keysgroup has an entry which is null', function (done) {
			var trs	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, null], 1, 2);
			trs.senderId = node.gAccount.address;

			multisignature.verify(trs, node.gAccount, function (err, trs) {
				expect(err).to.equal('Invalid member in keysgroup');
				done();
			});
		});

		it('should call the account.merge with correct params', function (done) {
			accountMock.merge.withArgs(sender.address, {
				u_multisignatures: trs.asset.multisignature.keysgroup,
				u_multimin: trs.asset.multisignature.min,
				u_multilifetime: trs.asset.multisignature.lifetime
			}).yields(null);

			multisignature.applyUnconfirmed(trs, sender, function () {
				accountMock.merge.verify();
				done();
			});
		});
	});

	describe('objectNormalize', function () {

		describe('min', function () {

			it('should return error when value is not an integer', function () {
				var min = '2';
				var trs	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '+' + multiSigAccount2.publicKey], 1, 2);
				trs.asset.multisignature.min = min;

				expect(function () {
					multisignature.objectNormalize(trs);
				}).to.throw('Failed to validate multisignature schema: Expected type integer but found type string');
			});

			it('should return error when value is a negative integer', function () {
				var min = -1;
				var trs	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '+' + multiSigAccount2.publicKey], 1, 2);
				trs.asset.multisignature.min = min;

				expect(function () {
					multisignature.objectNormalize(trs);
				}).to.throw('Failed to validate multisignature schema: Value -1 is less than minimum 1');
			});

			it('should return error when value is smaller than minimum acceptable value', function () {
				var min = constants.multisigConstraints.min.minimum - 1;
				var trs	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '+' + multiSigAccount2.publicKey], 1, min);

				expect(function () {
					multisignature.objectNormalize(trs);
				}).to.throw('Failed to validate multisignature schema: Value 0 is less than minimum 1');
			});

			it('should return error when value is greater than maximum acceptable value', function () {
				var min = constants.multisigConstraints.min.maximum + 1;
				var trs	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '-' + multiSigAccount2.publicKey], 1, min);

				expect(function () {
					multisignature.objectNormalize(trs);
				}).to.throw('Failed to validate multisignature schema: Value 16 is greater than maximum 15');
			});

			it('should return error when value is an overflow number', function () {
				var min = Number.MAX_VALUE + 1;
				var trs	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '-' + multiSigAccount2.publicKey], 1, 2);
				trs.asset.multisignature.min = min;

				expect(function () {
					multisignature.objectNormalize(trs);
				}).to.throw('Failed to validate multisignature schema: Value 1.7976931348623157e+308 is greater than maximum 15');
			});
		});

		describe('lifetime', function () {

			it('should return error when value is not an integer', function () {
				var lifetime = '2';
				var trs	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '-' + multiSigAccount2.publicKey], 1, 2);
				trs.asset.multisignature.lifetime = lifetime;

				expect(function () {
					multisignature.objectNormalize(trs);
				}).to.throw('Failed to validate multisignature schema: Expected type integer but found type string');
			});

			it('should return error when value is smaller than minimum acceptable value', function () {
				var lifetime = node.constants.multisigConstraints.lifetime.minimum - 1;
				var trs	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '-' + multiSigAccount2.publicKey], lifetime, 2);

				expect(function () {
					multisignature.objectNormalize(trs);
				}).to.throw('Failed to validate multisignature schema: Value 0 is less than minimum 1');
			});

			it('should return error when value is greater than maximum acceptable value', function () {
				var lifetime = node.constants.multisigConstraints.lifetime.maximum + 1;
				var trs	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '-' + multiSigAccount2.publicKey], lifetime, 2);

				expect(function () {
					multisignature.objectNormalize(trs);
				}).to.throw('Failed to validate multisignature schema: Value 73 is greater than maximum 72');
			});

			it('should return error when value is an overflow number', function () {
				var lifetime = Number.MAX_VALUE;
				var trs	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '-' + multiSigAccount2.publicKey], 1, 2);
				trs.asset.multisignature.lifetime = lifetime;

				expect(function () {
					multisignature.objectNormalize(trs);
				}).to.throw('Failed to validate multisignature schema: Value 1.7976931348623157e+308 is greater than maximum 72');
			});
		});

		describe('keysgroup', function () {

			it('should return error when it is not an array', function () {
				var trs	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, [''], 1, 2);
				trs.asset.multisignature.keysgroup = '';

				expect(function () {
					multisignature.objectNormalize(trs);
				}).to.throw('Failed to validate multisignature schema: Expected type array but found type string');
			});

			it('should return error when array length is smaller than minimum acceptable value', function () {
				var keysgroup = [];
				var trs	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, keysgroup, 1, 2);

				expect(function () {
					multisignature.objectNormalize(trs);
				}).to.throw('Failed to validate multisignature schema: Array is too short (0), minimum 1');
			});

			it('should return error when array length is greater than maximum acceptable value', function () {
				var keysgroup = Array.apply(null, Array(constants.multisigConstraints.keysgroup.maxItems + 1)).map(function () {
					return '+' + node.lisk.crypto.getKeys(node.randomPassword()).publicKey;
				});
				var trs	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, keysgroup, 1, 2);

				expect(function () {
					multisignature.objectNormalize(trs);
				}).to.throw('Failed to validate multisignature schema: Array is too long (16), maximum 15');
			});
		});

		it('should return transaction when asset is valid', function () {
			var trs	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, Array.apply(null, Array(10)).map(function () {
				return '+' + node.lisk.crypto.getKeys(node.randomPassword()).publicKey;
			}), 1, 2);

			expect(multisignature.objectNormalize(trs)).to.eql(trs);
		});

		it('should use the correct format to validate against', function () {
			var library = Multisignature.__get__('library');
			var schemaSpy = sinon.spy(library.schema, 'validate');
			multisignature.objectNormalize(trs);
			expect(schemaSpy.calledOnce).to.equal(true);
			expect(schemaSpy.calledWithExactly(trs.asset.multisignature, Multisignature.prototype.schema)).to.equal(true);
			schemaSpy.restore();
		});

		it('should return error asset schema is invalid', function () {
			trs.asset.multisignature.min = -1;

			expect(function () {
				multisignature.objectNormalize(trs);
			}).to.throw('Failed to validate multisignature schema: Value -1 is less than minimum 1');
		});

		it('should return transaction when asset is valid', function () {
			expect(multisignature.objectNormalize(trs)).to.eql(trs);
		});
	});

	describe('dbRead', function () {

		describe('when raw.m_keysgroup does not exist', function () {

			beforeEach(function () {
				delete rawTrs.m_keysgroup;
			});

			it('should return null', function () {
				expect(multisignature.dbRead(rawTrs)).to.eql(null);
			});
		});

		describe('when raw.m_keysgroup exists', function () {

			it('should return result containing multisignature', function () {
				expect(multisignature.dbRead(rawTrs)).to.have.property('multisignature');
			});

			it('should return result containing multisignature.min = raw.m_min', function () {
				expect(multisignature.dbRead(rawTrs)).to.have.nested.property('multisignature.min').equal(rawTrs.m_min);
			});

			it('should return result containing multisignature.lifetime = raw.lifetime', function () {
				expect(multisignature.dbRead(rawTrs)).to.have.nested.property('multisignature.lifetime').equal(rawTrs.m_lifetime);
			});

			describe('when raw.m_keysgroup is not a string', function () {

				beforeEach(function () {
					rawTrs.m_keysgroup = {};
				});

				it('should return result containing multisignature.keysgroup = []', function () {
					expect(multisignature.dbRead(rawTrs)).to.have.nested.property('multisignature.keysgroup').eql([]);
				});
			});

			describe('when raw.m_keysgroup = "a,b,c"', function () {

				beforeEach(function () {
					rawTrs.m_keysgroup = 'a,b,c';
				});

				it('should return result containing multisignature.keysgroup = ["a", "b", "c"]', function () {
					expect(multisignature.dbRead(rawTrs)).to.have.nested.property('multisignature.keysgroup').eql(['a', 'b', 'c']);
				});
			});
		});
	});

	describe('dbSave', function () {

		var dbSaveResult;

		beforeEach(function () {
			dbSaveResult = multisignature.dbSave(trs);
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

		it('should return result containing values.min = trs.asset.multisignature.min', function () {
			expect(dbSaveResult).to.have.nested.property('values.min').equal(trs.asset.multisignature.min);
		});

		it('should return result containing values.lifetime = trs.asset.multisignature.lifetime', function () {
			expect(dbSaveResult).to.have.nested.property('values.lifetime').equal(trs.asset.multisignature.lifetime);
		});

		it('should return result containing values.keysgroup equal joined keysgroup as string', function () {
			expect(dbSaveResult).to.have.nested.property('values.keysgroup').equal(trs.asset.multisignature.keysgroup.join(','));
		});

		it('should return result containing values.transactionId = trs.id', function () {
			expect(dbSaveResult).to.have.nested.property('values.transactionId').equal(trs.id);
		});
	});

	describe('ready', function () {

		it('should return true for single signature trs', function () {
			expect(multisignature.ready(trs, sender)).to.equal(true);
		});

		it('should return false for multi signature transaction with less signatures', function () {
			sender.multisignatures = [validKeypair.publicKey.toString('hex')];

			expect(multisignature.ready(trs, sender)).to.equal(false);
		});

		it('should return true for multi signature transaction with alteast min signatures', function () {
			sender.multisignatures = [validKeypair.publicKey.toString('hex')];
			sender.multimin = 1;

			delete trs.signature;
			// Not really correct signature, but we are not testing that over here
			trs.signature = crypto.randomBytes(64).toString('hex');;
			trs.signatures = [crypto.randomBytes(64).toString('hex')];

			expect(multisignature.ready(trs, sender)).to.equal(true);
		});
	});
});
