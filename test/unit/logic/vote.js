'use strict';/*eslint*/

var node = require('./../../node.js');
var ed = require('../../../helpers/ed');
var crypto = require('crypto');
var async = require('async');

var chai = require('chai');
var sinon = require('sinon');
var expect = require('chai').expect;
var _  = require('lodash');
var sinon = require('sinon');
var transactionTypes = require('../../../helpers/transactionTypes');

var modulesLoader = require('../../common/initModule').modulesLoader;
var TransactionLogic = require('../../../logic/transaction.js');
var Vote = require('../../../logic/vote.js');
var Rounds = require('../../../modules/rounds.js');
var AccountLogic = require('../../../logic/account.js');
var AccountModule = require('../../../modules/accounts.js');
var DelegateModule = require('../../../modules/delegates.js');

var vote;

var senderHash = crypto.createHash('sha256').update(node.gAccount.password, 'utf8').digest();
var senderKeypair = ed.makeKeypair(senderHash);

var transactionVotes = [
	'+9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
	'+141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a',
	'+3ff32442bb6da7d60c1b7752b24e6467813c9b698e0f278d48c43580da972135',
	'+5d28e992b80172f38d3a2f9592cad740fd18d3c2e187745cd5f7badf285ed819',
	'+4fe5cd087a319956ddc05725651e56486961b7d5733ecd23e26e463bf9253bb5',
	'+a796e9c0516a40ccd0eee7a32fdc2dc297fee40a9c76fef9c1bb0cf41ae69750',
	'+67651d29dc8d94bcb1174d5bd602762850a89850503b01a5ffde3b726b43d3d2',
	'+c3d1bc76dea367512df3832c437c7b2c95508e140f655425a733090da86fb82d',
];

var validSender = {
	username: null,
	isDelegate: 0,
	secondSignature: 0,
	address: '16313739661670634666L',
	publicKey: 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	secondPublicKey: null,
	balance: 9850458911801508,
	u_balance: 9850458911801508,
	vote: 0,
	multisignatures: null,
	multimin: 0,
	multilifetime: 0,
	blockId: '8505659485551877884',
	nameexist: 0,
	producedblocks: 0,
	missedblocks: 0,
	fees: 0,
	rewards: 0,
	virgin: 0
};

var validTransactionData = {
	type: 3,
	amount: 8067474861277,
	sender: validSender,
	senderId: '16313739661670634666L',
	fee: 10000000,
	keypair: senderKeypair,
	publicKey: 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	votes: transactionVotes
};

var validTransaction = {
	id: '9314232245035524467',
	rowId: 103,
	blockId: '6524861224470851795',
	type: 3,
	timestamp: 0,
	senderPublicKey: 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	senderId: '16313739661670634666L',
	recipientId: '16313739661670634666L',
	amount: 0,
	fee: 0,
	signature: '9f9446b527e93f81d3fb8840b02fcd1454e2b6276d3c19bd724033a01d3121dd2edb0aff61d48fad29091e222249754e8ec541132032aefaeebc312796f69e08',
	asset: {}
};

describe('vote', function () {

	var bindings;

	before(function (done) {
		async.auto({
			rounds: function (cb) {
				modulesLoader.initModule(Rounds, {}, cb);
			},
			accountLogic: function (cb) {
				modulesLoader.initLogicWithDb(AccountLogic, cb, {});
			},
			transactionLogic: ['accountLogic', function (result, cb) {
				modulesLoader.initLogicWithDb(TransactionLogic, cb, {
					ed: require('../../../helpers/ed'),
					account: result.account
				});
			}],
			accountModule: ['accountLogic', 'transactionLogic', function (result, cb) {
				modulesLoader.initModuleWithDb(AccountModule, cb, {
					logic: {
						account: result.accountLogic,
						transaction: result.transactionLogic
					}
				});
			}],
			delegateModule: ['accountModule', function (result, cb) {
				modulesLoader.initModuleWithDb(DelegateModule, cb, {
					modules: {
						accounts: result.accountModule
					},
					library: {
						schema: modulesLoader.scope.schema
					}
				});
			}]
		}, function (err, result) {
			expect(err).to.not.exist;
			vote = new Vote();
			bindings = {
				modules: {
					delegates: result.delegateModule,
					rounds: result.rounds
				},
				library: modulesLoader.scope
			};
			vote.bind(bindings);
			done();
		});
	});

	describe('bind', function () {

		it('should throw without params', function () {
			expect(function () {
				vote.bind();
			}).to.throw();
		});

		it('should be okay with correct params', function () {
			vote.bind(bindings);
			expect(function () {
				vote.bind(bindings);
			}).to.not.throw();
		});
	});

	describe('create', function () {

		it('should throw with empty parameters', function () {
			expect(function () {
				vote.create();
			}).to.throw();
		});

		it('should be okay with valid parameters', function () {
			expect(vote.create(validTransactionData, validTransaction)).to.be.an('object');
		});
	});

	describe('calculateFee', function () {
		it('should return the correct fee', function () {
			expect(vote.calculateFee()).to.equal(node.constants.fees.vote);
		});
	});

	describe('verify', function () {

	});

	describe('verifyVote', function () {

	});

	describe('checkConfirmedDelegates', function () {

	});

	describe('checkUnconfirmedDelegates', function () {

	});

	describe('process', function () {

	});

	describe('apply', function () {

	});

	describe('undo', function () {

	});
	describe('applyUnconfirmed', function () {

	});
	describe('undoUnconfirmed', function () {

	});
	describe('objectNormalize', function () {

	});
	describe('dbRead', function () {

	});
	describe('dbSave', function () {

	});
	describe('ready', function () {

	});
});
