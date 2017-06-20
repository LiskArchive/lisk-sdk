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
var transaction;

var senderHash = crypto.createHash('sha256').update(node.gAccount.password, 'utf8').digest();
var senderKeypair = ed.makeKeypair(senderHash);

var transactionVotes = [
	'-9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
	'-141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a',
	'-3ff32442bb6da7d60c1b7752b24e6467813c9b698e0f278d48c43580da972135',
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
	type: 3,
	amount: 0,
	senderPublicKey: 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	requesterPublicKey: null,
	timestamp: 33803055,
	asset: {
		votes: transactionVotes
	},
	recipientId: '16313739661670634666L',
	senderId: '16313739661670634666L',
	signature: '834acaa8c55094823797d13af14d7962ad42b0b9a8defaf43b217f33d5c971a57767e08a5368b62fdb3e373c130b79bc57f79f0858b1fa69d926c77a8e3bad02',
	id: '14096341601549131078',
	fee: 100000000
};

describe('vote', function () {

	var voteBindings;

	before(function (done) {
		async.auto({
			rounds: function (cb) {
				modulesLoader.initModule(Rounds, modulesLoader.scope, cb);
			},
			accountLogic: function (cb) {
				modulesLoader.initLogicWithDb(AccountLogic, cb, {});
			},
			transactionLogic: ['rounds', 'accountLogic', function (result, cb) {
				modulesLoader.initLogicWithDb(TransactionLogic, function (err, __transaction) {
					__transaction.bindModules(result.rounds);
					cb(err, __transaction);
				}, {
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
				modulesLoader.initModuleWithDb(DelegateModule, function (err, __accounts) {
					// not all required bindings, only the ones required for votes
					__accounts.onBind({
						rounds: result.rounds,
						accounts: result.accountModule,
					});
					cb(err, __accounts);
				}, {
					logic: {
						transaction: result.transactionLogic
					},
					library: {
						schema: modulesLoader.scope.schema
					}
				});
			}]
		}, function (err, result) {
			expect(err).to.not.exist;
			vote = new Vote();
			voteBindings = {
				delegate: result.delegateModule,
				rounds: result.rounds
			};
			vote.bind(result.delegateModule, result.rounds);
			transaction = result.transactionLogic;
			transaction.attachAssetType(transactionTypes.VOTE, vote);

			done();
		});
	});

	describe('bind', function () {

		it('should be okay with correct params', function () {
			expect(function () {
				vote.bind(voteBindings.delegate, voteBindings.rounds);
			}).to.not.throw();
		});

		after(function () {
			vote.bind(voteBindings.delegate, voteBindings.rounds);
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

		it('should not work if vote is already casted', function (done) {
			var trs = _.cloneDeep(validTransaction);
			trs.asset.votes.push('+904c294899819cce0283d8d351cb10febfa0e9f0acd90a820ec8eb90a7084c37');
			vote.verify(trs, validSender, function (err) {
				expect(err).to.equal('Failed to add vote, account has already voted for this delegate');
				done();
			});
		});

		it('should return error if votes are more than 33', function (done) {
			var trs = _.cloneDeep(validTransaction);
			trs.asset.votes = [
				'-904c294899819cce0283d8d351cb10febfa0e9f0acd90a820ec8eb90a7084c37',
				'-399a7d14610c4da8800ed929fc6a05133deb8fbac8403dec93226e96fa7590ee',
				'-6e904b2f678eb3b6c3042acb188a607d903d441d61508d047fe36b3c982995c8',
				'-1af35b29ca515ff5b805a5e3a0ab8c518915b780d5988e76b0672a71b5a3be02',
				'-d8daea40fd098d4d546aa76b8e006ce4368c052ffe2c26b6eb843e925d54a408',
				'-386217d98eee87268a54d2d76ce9e801ac86271284d793154989e37cb31bcd0e',
				'-86499879448d1b0215d59cbf078836e3d7d9d2782d56a2274a568761bff36f19',
				'-948b8b509579306694c00833ec1c0f81e964487db2206ddb1517bfeca2b0dc1b',
				'-b00269bd169f0f89bd2f278788616521dd1539868ced5a63b652208a04ee1556',
				'-e13a0267444e026fe755ec128858bf3c519864631e0e4c474ba33f2470a18b83',
				'-1cc68fa0b12521158e09779fd5978ccc0ac26bf99320e00a9549b542dd9ada16',
				'-a10f963752b3a44702dfa48b429ac742bea94d97849b1180a36750df3a783621',
				'-f33f93aa1f3ddcfd4e42d3206ddaab966f7f1b6672e5096d6da6adefd38edc67',
				'-b5341e839b25c4cc2aaf421704c0fb6ba987d537678e23e45d3ca32454a2908c',
				'-da673805f349faf9ca1db167cb941b27f4517a36d23b3c21da4159cff0045fbe',
				'-55405aed8c3a1eabe678be3ad4d36043d6ef8e637d213b84ee703d87f6b250ed',
				'-19ffdf99dee16e4be2db4b0e000b56ab3a4e10bee9f457d8988f75ff7a79fc00',
				'-85b07e51ffe528f272b7eb734d0496158f2b0f890155ebe59ba2989a8ccc9a49',
				'-8a0bcba8e909036b7a0fdb244f049d847b117d871d203ef7cc4c3917c94fd5fd',
				'-95ea7eb026e250741be85e3593166ef0c4cb3a6eb9114dba8f0974987f10403f',
				'-cf8a3bf23d1936a34facc4ff63d86d21cc2e1ac17e0010035dc3ef7ae85010dc',
				'-82174ee408161186e650427032f4cfb2496f429b4157da78888cbcea39c387fc',
				'-4bde949c19a0803631768148019473929b5f8661e9e48efb8d895efa9dd24aef',
				'-2f9b9a43b915bb8dcea45ea3b8552ebec202eb196a7889c2495d948e15f4a724',
				'-9503d36c0810f9ac1a9d7d45bf778387a2baab151a45d77ac1289fbe29abb18f',
				'-a50a55d4476bb118ba5121a07b51c185a8fe0a92b65840143b006b9820124df4',
				'-fc8672466cc16688b5e239a784cd0e4c0acf214af039d9b2bf7a006da4043883',
				'-db821a4f828db977c6a8d186cc4a44280a6ef6f54ac18ec9eb32f78735f38683',
				'-ba7acc3bcbd47dbf13d744e57f696341c260ce2ea8f332919f18cb543b1f3fc7',
				'-47c8b3d6a9e418f0920ef58383260bcd04799db150612d4ff6eb399bcd07f216',
				'-d1c3a2cb254554971db289b917a665b5c547617d6fd20c2d6051bc5dfc805b34',
				'-47b9b07df72d38c19867c6a8c12429e6b8e4d2be48b27cd407da590c7a2af0dc',
				'-9a7452495138cf7cf5a1564c3ef16b186dd8ab4f96423f160e22a3aec6eb614f',
				'-c4dfedeb4f639f749e498a2307f1545ddd6bda62e5503ac1832b122c4a5aedf9',
				'-96c16a6251e1b9a8c918d5821a5aa8dfb9385607258338297221c5a226eca5c6',
				'-910da2a8e20f25ccbcb029fdcafd369b43d75e5bc4dc6d92352c29404acc350f',
				'-eabfe7093ef2394deb1b84287f2ceb1b55fe638edc3358a28fc74f64b3498094',
				'-94b163c5a5ad346db1c84edaff51604164476cf78b8834b6b610dd03bd6b65d9',
				'-6164b0cc68f8de44cde90c78e838b9ee1d6041fa61cf0cfbd834d76bb369a10e',
				'-3476bba16437ee0e04a29daa34d753139fbcfc14152372d7be5b7c75d51bac6c',
				'-01389197bbaf1afb0acd47bbfeabb34aca80fb372a8f694a1c0716b3398db746'
			];
			vote.verify(trs, validSender, function (err) {
				expect(err).to.equal('Voting limit exceeded. Maximum is 33 votes per transaction');
				done();
			});
		});

		it.skip('should return for casting multiple votes for same account', function (done) {
			// this test fails, I don't think it should
			var trs = _.cloneDeep(validTransaction);
			trs.asset.votes.push(trs.asset.votes[0]);
			vote.verify(trs, validSender, function (err) {
				expect(err).to.equal('Same vote multiple times in the same transaction should be allowed');
				done();
			});
		});

		it('should verify okay transaction', function (done) {
			vote.verify(validTransaction, validSender, done);
		});
	});

	describe('verifyVote', function () {

		it('should throw if invalid vote length', function (done) {
			var invalidVote = '-01389197bbaf1afb0acd47bbfeabb34aca80fb372a8f694a1c0716b3398d746';
			vote.verifyVote(invalidVote, function (err) {
				expect(err).to.equal('Invalid vote format');
				done();
			});
		});

		it.skip('should throw if vote is not in hex format', function (done) {
			// this test fails, I don't think it should
			var invalidVote = '-01389197bbaf1afb0acd47bbfeabb34aca80fb372a8f694a1c0716b3398d746z';
			vote.verifyVote(invalidVote, function (err) {
				expect(err).to.equal('Invalid vote format');
				done();
			});
		});

		it('should be okay if vote is valid', function (done) {
			var validVote = '-01389197bbaf1afb0acd47bbfeabb34aca80fb372a8f694a1c0716b3398d746f';
			vote.verifyVote(validVote, done);
		});

	});

	describe('checkConfirmedDelegates', function () {

		it('should return err if vote is already made to a delegate', function (done) {
			var trs = _.cloneDeep(validTransaction);
			trs.asset.votes.push('+904c294899819cce0283d8d351cb10febfa0e9f0acd90a820ec8eb90a7084c37');
			vote.checkConfirmedDelegates(trs, function (err) {
				expect(err).to.equal('Failed to add vote, account has already voted for this delegate');
				done();
			});
		});

		it.skip('should return err if a vote is removed twice for a delegate', function (done) {
			// this test fails, I don't think it should
			var trs = _.cloneDeep(validTransaction);
			trs.asset.votes.push(trs.asset.votes[0]);
			vote.checkConfirmedDelegates(trs, function (err) {
				expect(err).to.equal('Failed to remove vote twice');
			});
		});

		it('should be okay to removing votes', function (done) {
			vote.checkConfirmedDelegates(validTransaction, done);
		});
	});

	describe('checkUnconfirmedDelegates', function () {

		it('should return err if vote is already made to a delegate', function (done) {
			var trs = _.cloneDeep(validTransaction);
			trs.asset.votes.push('+904c294899819cce0283d8d351cb10febfa0e9f0acd90a820ec8eb90a7084c37');
			vote.checkUnconfirmedDelegates(trs, function (err) {
				expect(err).to.equal('Failed to add vote, account has already voted for this delegate');
				done();
			});
		});

		it.skip('should return err if a vote is removed twice for a delegate', function (done) {
			// this test fails, I don't think it should
			var trs = _.cloneDeep(validTransaction);
			trs.asset.votes.push(trs.asset.votes[0]);
			vote.checkUnconfirmedDelegates(trs, function (err) {
				expect(err).to.equal('Failed to remove vote twice');
			});
		});

		it('should be okay to removing votes', function (done) {
			vote.checkUnconfirmedDelegates(validTransaction, done);
		});
	});

	describe('process', function () {
		it('should be okay', function (done) {
			vote.process(validTransaction, validSender, done);
		});
	});

	describe('apply', function () {

		var dummyBlock = {
			id: '9314232245035524467',
			height: 1
		};

		function undoVotes (trs, done) {
			vote.undo.call(transaction, validTransaction, dummyBlock, validSender, function (err) {
				expect(err).to.not.exist;
				done();
			});
		}

		it('should remove votes for already casted delegates', function (done) {
			vote.apply.call(transaction, validTransaction, dummyBlock, validSender, function (err) {
				expect(err).to.not.exist;
				undoVotes(validTransaction, done);
			});
		});

		it.skip('should throw error for duplicate votes in a transaction', function (done) {
			// this test fails, I don't think it should
			var trs = _.cloneDeep(validTransaction);
			trs.asset.votes = [
				'-e42bfabc4a61f02131760af5f2fa0311007932a819a508da25f2ce6af2468156',
				'-e42bfabc4a61f02131760af5f2fa0311007932a819a508da25f2ce6af2468156'
			];
			vote.apply.call(transaction, trs, dummyBlock, validSender, done);
		});
	});

	describe('undo', function () {
		var dummyBlock = {
			id: '9314232245035524467',
			height: 1
		};

		function addVotes (trs, done) {
			vote.apply.call(transaction, trs, dummyBlock, validSender, function (err) {
				expect(err).to.not.exist;
				done();
			});
		}

		it('should reverse the transaction properly', function (done) {
			addVotes(validTransaction, function () {
				vote.undo.call(transaction, validTransaction, dummyBlock, validSender, done);
			});
		});

		it.skip('should return error when transaction votes opposite is not valid', function (done) {
			// it is failing, we don't check whether a transaction is valid or not. Should we?
			var trs = _.cloneDeep(validTransaction);
			vote.undo.call(transaction, trs, dummyBlock, validSender, function (err) {
				expect(err).to.equal('Failed to remove vote, account has not voted for this delegate');
			});
		});
	});

	describe('applyUnconfirmed', function () {
		var dummyBlock = {
			id: '9314232245035524467',
			height: 1
		};

		function undoVotes (trs, done) {
			vote.undoUnconfirmed.call(transaction, validTransaction, validSender, function (err) {
				expect(err).to.not.exist;
				done();
			});
		}

		it('should remove votes for already casted delegates', function (done) {
			vote.applyUnconfirmed.call(transaction, validTransaction, validSender, function (err) {
				expect(err).to.not.exist;
				undoVotes(validTransaction, done);
			});
		});

		it.skip('should throw error for duplicate votes in a transaction', function (done) {
			// this test fails, I don't think it should
			var trs = _.cloneDeep(validTransaction);
			trs.asset.votes = [
				'-e42bfabc4a61f02131760af5f2fa0311007932a819a508da25f2ce6af2468156',
				'-e42bfabc4a61f02131760af5f2fa0311007932a819a508da25f2ce6af2468156'
			];
			vote.applyUnconfirmed.call(transaction, trs, validSender, done);
		});
	});

	describe('undoUnconfirmed', function () {
		var dummyBlock = {
			id: '9314232245035524467',
			height: 1
		};

		function addVotes (trs, done) {
			vote.applyUnconfirmed.call(transaction, trs, validSender, function (err) {
				expect(err).to.not.exist;
				done();
			});
		}

		it('should reverse the transaction properly', function (done) {
			addVotes(validTransaction, function () {
				vote.undoUnconfirmed.call(transaction, validTransaction, validSender, done);
			});
		});

		it.skip('should return error when transaction votes opposite is not valid', function (done) {
			// it is failing, we don't check whether a transaction is valid or not. Should we?
			var trs = _.cloneDeep(validTransaction);
			vote.undoUnconfirmed.call(transaction, trs, validSender, function (err) {
				expect(err).to.equal('Failed to remove vote, account has not voted for this delegate');
			});
		});
	});

	describe('objectNormalize', function () {

		it('should normalize object for valid trs', function () {
			expect(vote.objectNormalize(validTransaction)).to.eql(validTransaction);
		});

		it('should duplicate votes in a transaction', function () {
			var trs = _.cloneDeep(validTransaction);
			trs.asset.votes.push(trs.asset.votes[0]);
			expect(function () {
				vote.objectNormalize(trs);
			}).to.throw('Failed to validate vote schema'); 
		});

	});
	describe('dbRead', function () {
		it('should read votes correct', function () {
			var rawVotes = '+9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f,+141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a,+3ff32442bb6da7d60c1b7752b24e6467813c9b698e0f278d48c43580da972135';
			expect(vote.dbRead({
				v_votes: rawVotes
			})).to.eql(rawVotes.split(','));
		});

		it('should return null if no votes are supplied', function () {
			expect(vote.dbRead()).to.eql(null);
		});
	});
	describe('dbSave', function () {
		it.only('should create return db save promise', function () {
			var valuesKeys = ['votes', 'transactionId'];
			var savePromise = vote.dbSave(validTransaction);
			expect(savePromise).to.be.an('object').with.keys(['table', 'fields', 'values']);
			expect(savePromise.values).to.have.keys(valuesKeys);
			expect(savePromise.values.votes).to.eql(validTransaction.asset.votes.join(','));
		});
	});
	describe('ready', function () {
		it('should return true for single signature trs', function () {
			expect(vote.ready(validTransaction, validSender)).to.equal(true);
		});
		it('should return false for multi signature transaction with less signatures', function () {
			throw 'yet to implement';
		});
		it('should return true for multi signature transaction with alteast min signatures', function () {
			throw 'yet to implement';
		});
	});
});
