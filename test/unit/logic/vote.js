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
var async = require('async');
var lisk = require('lisk-elements').default;
var accountFixtures = require('../../fixtures/accounts');
var application = require('../../common/application');
var randomUtil = require('../../common/utils/random');
var modulesLoader = require('../../common/modules_loader');
var ed = require('../../../helpers/ed');
var diff = require('../../../helpers/diff');
var transactionTypes = require('../../../helpers/transaction_types');
var Bignum = require('../../../helpers/bignum.js');
var Vote = require('../../../logic/vote');
var Transfer = require('../../../logic/transfer');

const { FEES, MAX_VOTES_PER_TRANSACTION } = __testContext.config.constants;
var validPassphrase =
	'robust weapon course unknown head trial pencil latin acid';
var validKeypair = ed.makeKeypair(
	crypto
		.createHash('sha256')
		.update(validPassphrase, 'utf8')
		.digest()
);

var validSender = {
	balance: '8067474861277',
	u_balance: '8067474861277',
	passphrase: 'hacnj1113nn7tujzia4i',
	username: 'i3Hb0kYEbk$r',
	publicKey: '65eac2bdd725a0a294e3a48de235108ff1a18a829e6d125ad50815a7c5356470',
	multimin: 0,
	address: '2262452491031990877L',
};

var senderHash = crypto
	.createHash('sha256')
	.update(validSender.passphrase, 'utf8')
	.digest();
var senderKeypair = ed.makeKeypair(senderHash);

var validTransaction = {
	type: 3,
	amount: '0',
	senderPublicKey:
		'65eac2bdd725a0a294e3a48de235108ff1a18a829e6d125ad50815a7c5356470',
	requesterPublicKey: null,
	timestamp: 34253582,
	asset: {
		votes: [
			'-9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
		],
	},
	data: undefined,
	recipientId: '2262452491031990877L',
	signature:
		'de668e2722fbc2fd02bac1bb66ff1238d75354f64ca0adc5b1967f5f4e67038336cee6a85af43ed9fa5f3a091890738de14c857bd7b1f9bade7ff1da1c395a0e',
	id: '5962289265698105102',
	fee: '100000000',
	senderId: '2262452491031990877L',
};

describe('vote', () => {
	var voteBindings;
	var vote;
	var accountsModule;
	var delegatesModule;
	var transactionLogic;
	var dummyBlock = {
		id: '9314232245035524467',
		height: 1,
	};

	var votedDelegates = [
		'76c9494237e608d43fd6fb0114106a7517f5503cf79d7482db58a02304339b6c',
		'bf9f5cfc548d29983cc0dfa5c4ec47c66c31df0f87aa669869678996902ab47f',
		'904c294899819cce0283d8d351cb10febfa0e9f0acd90a820ec8eb90a7084c37',
	];
	function addVotes(votes, done) {
		var transaction = _.clone(validTransaction);
		transaction.asset.votes = votes;
		async.parallel(
			[
				function(cb) {
					vote.applyConfirmed(transaction, dummyBlock, validSender, cb);
				},
				function(cb) {
					vote.applyUnconfirmed(transaction, validSender, cb);
				},
			],
			done
		);
	}

	function checkAccountVotes(senderPublicKey, state, votes, action, done) {
		votes = action == 'apply' ? votes : diff.reverse(votes);
		accountsModule.getAccount(
			{ publicKey: senderPublicKey },
			(err, account) => {
				var delegates =
					(state === 'confirmed' ? account.delegates : account.u_delegates) ||
					[];
				var groupedVotes = _.groupBy(votes, v => {
					return v[0];
				});
				// added one because expect doesn't have isGreaterThanOrEqualTo condition
				expect(
					delegates.filter(v => {
						return (
							groupedVotes['+'] && groupedVotes['+'].indexOf(`+${v}`) != -1
						);
					}).length + 1
				).to.be.above(groupedVotes['+'] ? groupedVotes['+'].length : 0);
				expect(
					delegates.filter(v => {
						return (
							groupedVotes['-'] && groupedVotes['-'].indexOf(`-${v}`) != -1
						);
					}).length
				).to.equal(0);
				done();
			}
		);
	}

	before(done => {
		application.init(
			{ sandbox: { name: 'lisk_test_logic_vote' } },
			(err, scope) => {
				accountsModule = scope.modules.accounts;
				delegatesModule = scope.modules.delegates;
				vote = new Vote(
					modulesLoader.scope.logger,
					modulesLoader.scope.schema,
					scope.logic.account
				);
				voteBindings = {
					delegate: delegatesModule,
					account: accountsModule,
				};
				vote.bind(delegatesModule);
				delegatesModule.onBind({
					accounts: accountsModule,
				});
				transactionLogic = scope.logic.transaction;
				transactionLogic.attachAssetType(transactionTypes.VOTE, vote);
				done();
			}
		);
	});

	after(done => {
		application.cleanup(done);
	});
	/* eslint-disable mocha/no-sibling-hooks */
	before(done => {
		// create new account for testing;
		var transfer = new Transfer();
		transfer.bind(voteBindings.account);
		transactionLogic.attachAssetType(transactionTypes.SEND, transfer);

		var sendTransaction = {
			type: 0,
			amount: new Bignum('8067474861277'),
			senderPublicKey:
				'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
			requesterPublicKey: null,
			timestamp: 34251006,
			asset: {},
			data: undefined,
			recipientId: '2262452491031990877L',
			signature:
				'f2910e221d88134265974d9fc8efee0532e7e14ffdb22a9674c64bfd01863e70da75db51f7e0adcfbe87d9efdaef9f914f577ca08a7664db290e8e5ad89eb30c',
			id: '4802102241260248478',
			fee: new Bignum('10000000'),
			senderId: '16313739661670634666L',
		};

		var sender = {
			username: null,
			isDelegate: 0,
			address: '16313739661670634666L',
			publicKey:
				'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
			balance: new Bignum('9850458911801508'),
			u_balance: new Bignum('9850458911801508'),
			blockId: '8505659485551877884',
		};

		transactionLogic.applyConfirmed(sendTransaction, dummyBlock, sender, done);
	});

	before(done => {
		addVotes(
			votedDelegates.map(v => {
				return `+${v}`;
			}),
			() => {
				// it's okay if it returns error, because that means I've already voted for these delegates
				done();
			}
		);
	});
	/* eslint-enable */

	describe('bind', () => {
		it('should be okay with correct params', () => {
			return expect(() => {
				vote.bind(voteBindings.delegate);
			}).to.not.throw();
		});

		after(() => {
			return vote.bind(voteBindings.delegate);
		});
	});

	describe('calculateFee', () => {
		it('should return the correct fee', () => {
			return expect(vote.calculateFee().isEqualTo(FEES.VOTE.toString())).to.be
				.true;
		});
	});

	describe('verify', () => {
		it('should return error when receipientId and sender id are different', done => {
			var transaction = _.cloneDeep(validTransaction);
			transaction.recipientId = accountFixtures.genesis.address;
			vote.verify(transaction, validSender, err => {
				expect(err).to.equal('Invalid recipient');
				done();
			});
		});

		it('should return error when votes are not set', done => {
			var transaction = _.cloneDeep(validTransaction);
			delete transaction.asset.votes;
			vote.verify(transaction, validSender, err => {
				expect(err).to.equal('Invalid transaction asset');
				done();
			});
		});

		it('should return error asset votes are not an array', done => {
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset.votes = `+${votedDelegates[0]}`;
			vote.verify(transaction, validSender, err => {
				expect(err).to.equal('Invalid votes. Must be an array');
				done();
			});
		});

		it('should return error when voting for an account twice', done => {
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset.votes = Array(...Array(2)).map((v, i) => {
				return (i % 2 ? '+' : '-') + votedDelegates[0];
			});

			vote.verify(transaction, validSender, err => {
				expect(err).to.equal(
					'Multiple votes for same delegate are not allowed'
				);
				done();
			});
		});

		it('should return error when votes array is empty', done => {
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset.votes = [];
			vote.verify(transaction, validSender, err => {
				expect(err).to.equal('Invalid votes. Must not be empty');
				done();
			});
		});

		it('should return error when removing vote for delegate sender has not voted', done => {
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset.votes = [
				`-${accountFixtures.existingDelegate.publicKey}`,
			];
			vote.verify(transaction, validSender, err => {
				expect(err).to.equal(
					`Failed to remove vote, delegate "${
						accountFixtures.existingDelegate.delegateName
					}" was not voted for`
				);
				done();
			});
		});

		it('should return error if votes are more than 33', done => {
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset.votes = [
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
				'-01389197bbaf1afb0acd47bbfeabb34aca80fb372a8f694a1c0716b3398db746',
			];
			vote.verify(transaction, validSender, err => {
				expect(err).to.equal(
					'Voting limit exceeded. Maximum is 33 votes per transaction'
				);
				done();
			});
		});

		it('should return error for casting multiple votes for same account in a transaction', done => {
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset.votes = Array(...Array(2)).map(() => {
				return '+904c294899819cce0283d8d351cb10febfa0e9f0acd90a820ec8eb90a7084c37';
			});
			vote.verify(transaction, validSender, err => {
				expect(err).to.equal(
					'Multiple votes for same delegate are not allowed'
				);
				done();
			});
		});

		it('should verify transaction with correct params', done => {
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset.votes = [
				'-904c294899819cce0283d8d351cb10febfa0e9f0acd90a820ec8eb90a7084c37',
			];
			vote.verify(transaction, validSender, done);
		});
	});

	describe('verifyVote', () => {
		it('should return error if vote contains non-hex value', done => {
			const invalidVote =
				'-z1389197bbaf1afb0acd47bbfeabb34aca80fb372a8f694a1c0716b3398d7466';
			vote.verifyVote(invalidVote, err => {
				expect(err).to.equal('Invalid vote format');
				done();
			});
		});

		it('should return error if vote length is less than 65', done => {
			const invalidVote =
				'-01389197bbaf1afb0acd47bbfeabb34aca80fb372a8f694a1c0716b3398d745';
			vote.verifyVote(invalidVote, err => {
				expect(err).to.equal('Invalid vote format');
				done();
			});
		});

		it('should return error if vote length is more than 65', done => {
			const invalidVote =
				'-01389197bbaf1afb0acd47bbfeabb34aca80fb372a8f694a1c0716b3398d74667';
			vote.verifyVote(invalidVote, err => {
				expect(err).to.equal('Invalid vote format');
				done();
			});
		});

		it('should be okay for removing vote', done => {
			var validVote =
				'-01389197bbaf1afb0acd47bbfeabb34aca80fb372a8f694a1c0716b3398d746f';
			vote.verifyVote(validVote, done);
		});

		it('should be okay for adding vote', done => {
			var validVote =
				'+01389197bbaf1afb0acd47bbfeabb34aca80fb372a8f694a1c0716b3398d746f';
			vote.verifyVote(validVote, done);
		});
	});

	describe('checkConfirmedDelegates (add vote)', () => {
		it('should return err if vote is already made to a delegate', done => {
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset.votes = votedDelegates.map(v => {
				return `+${v}`;
			});
			vote.checkConfirmedDelegates(transaction, err => {
				expect(err).to.equal(
					'Failed to add vote, delegate "genesis_95" already voted for'
				);
				done();
			});
		});

		it('should return err when account is not a delegate', done => {
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset.votes = [`+${accountFixtures.genesis.publicKey}`];
			vote.checkConfirmedDelegates(transaction, err => {
				expect(err).to.equal('Delegate not found');
				done();
			});
		});

		it('should be okay when adding vote to a delegate', done => {
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset.votes = [
				`+${accountFixtures.existingDelegate.publicKey}`,
			];
			vote.checkConfirmedDelegates(transaction, done);
		});
	});

	describe('checkConfirmedDelegates (remove vote)', () => {
		it('should return err if vote is not made for a delegate', done => {
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset.votes = [
				'-9f2fcc688518324273da230afff9756312bf23592174896fab669c2d78b1533c',
			];
			vote.checkConfirmedDelegates(transaction, err => {
				expect(err).to.equal(
					'Failed to remove vote, delegate "genesis_86" was not voted for'
				);
				done();
			});
		});

		it('should be okay when removing vote for a delegate', done => {
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset.votes = votedDelegates.map(v => {
				return `-${v}`;
			});
			vote.checkConfirmedDelegates(transaction, done);
		});
	});

	describe('checkUnconfirmedDelegates (add vote)', () => {
		it('should return err if vote is already made to a delegate', done => {
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset.votes = votedDelegates.map(v => {
				return `+${v}`;
			});
			vote.checkUnconfirmedDelegates(transaction, err => {
				expect(err).to.equal(
					'Failed to add vote, delegate "genesis_95" already voted for'
				);

				done();
			});
		});

		it('should return err when account is not a delegate', done => {
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset.votes = [`+${accountFixtures.genesis.publicKey}`];
			vote.checkUnconfirmedDelegates(transaction, err => {
				expect(err).to.equal('Delegate not found');
				done();
			});
		});

		it('should be okay when adding vote to a delegate', done => {
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset.votes = [
				`+${accountFixtures.existingDelegate.publicKey}`,
			];
			vote.checkUnconfirmedDelegates(transaction, done);
		});
	});

	describe('checkUnconfirmedDelegates (remove vote)', () => {
		it('should return err if vote is not made for a delegate', done => {
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset.votes = [
				'-9f2fcc688518324273da230afff9756312bf23592174896fab669c2d78b1533c',
			];
			vote.checkUnconfirmedDelegates(transaction, err => {
				expect(err).to.equal(
					'Failed to remove vote, delegate "genesis_86" was not voted for'
				);
				done();
			});
		});

		it('should return okay when removing vote for a delegate', done => {
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset.votes = votedDelegates.map(v => {
				return `-${v}`;
			});
			vote.checkUnconfirmedDelegates(transaction, done);
		});
	});

	describe('process', () => {
		it('should be okay', done => {
			vote.process(validTransaction, validSender, done);
		});
	});

	describe('getBytes', () => {
		let transaction;
		beforeEach(done => {
			transaction = _.cloneDeep(validTransaction);
			done();
		});

		it('should throw an error for undefined votes', () => {
			transaction.asset = undefined;
			return expect(() => {
				vote.getBytes(transaction);
			}).to.throw();
		});

		it('should return buffer for votes with plus and minus public keys', () => {
			const data = {
				votes: [
					'-9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					'+3d9069145acab346f98ad9b23f7a2926c74258670fe98b37c100c01fca9f2f0f',
				],
			};
			transaction.asset = data;
			const voteBuffer = Buffer.from(data.votes.join(''), 'utf8');

			return expect(vote.getBytes(transaction)).to.eql(voteBuffer);
		});

		it('should be okay for utf-8 data value', () => {
			const data = {
				votes: [
					'-Zu¨¨¨¨ka Ωlaå69145acab346f98ad9b23f7a2926c74258670fe98b37c100c01',
				],
			};
			transaction.asset = data;

			return expect(vote.getBytes(transaction)).to.eql(
				Buffer.from(data.votes[0], 'utf8')
			);
		});
	});

	describe('applyConfirmed', () => {
		it('should remove votes for delegates', done => {
			var transaction = _.clone(validTransaction);
			transaction.asset.votes = votedDelegates.map(v => {
				return `-${v}`;
			});
			vote.applyConfirmed(transaction, dummyBlock, validSender, () => {
				checkAccountVotes(
					transaction.senderPublicKey,
					'confirmed',
					transaction.asset.votes,
					'apply',
					done
				);
			});
		});

		it('should add vote for delegate', done => {
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset.votes = votedDelegates.map(v => {
				return `+${v}`;
			});
			vote.applyConfirmed(transaction, dummyBlock, validSender, () => {
				checkAccountVotes(
					transaction.senderPublicKey,
					'confirmed',
					transaction.asset.votes,
					'apply',
					done
				);
			});
		});
	});

	describe('undoConfirmed', () => {
		it('should undoConfirmed remove votes for delegates', done => {
			var transaction = _.clone(validTransaction);
			transaction.asset.votes = votedDelegates.map(v => {
				return `-${v}`;
			});
			vote.undoConfirmed(validTransaction, dummyBlock, validSender, () => {
				checkAccountVotes(
					transaction.senderPublicKey,
					'confirmed',
					transaction.asset.votes,
					'undo',
					done
				);
			});
		});

		it('should undoConfirmed add vote for delegate', done => {
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset.votes = votedDelegates.map(v => {
				return `+${v}`;
			});
			vote.undoConfirmed(transaction, dummyBlock, validSender, () => {
				checkAccountVotes(
					transaction.senderPublicKey,
					'confirmed',
					transaction.asset.votes,
					'undo',
					done
				);
			});
		});
	});

	describe('applyUnconfirmed', () => {
		it('should remove votes for delegates', done => {
			var transaction = _.clone(validTransaction);
			transaction.asset.votes = votedDelegates.map(v => {
				return `-${v}`;
			});
			vote.applyUnconfirmed(validTransaction, validSender, () => {
				checkAccountVotes(
					transaction.senderPublicKey,
					'unconfirmed',
					transaction.asset.votes,
					'apply',
					done
				);
			});
		});

		it('should add vote for delegate', done => {
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset.votes = votedDelegates.map(v => {
				return `+${v}`;
			});
			vote.applyUnconfirmed(transaction, validSender, () => {
				checkAccountVotes(
					transaction.senderPublicKey,
					'unconfirmed',
					transaction.asset.votes,
					'apply',
					done
				);
			});
		});
	});

	describe('undoUnconfirmed', () => {
		it('should undo remove votes for delegates', done => {
			var transaction = _.clone(validTransaction);
			transaction.asset.votes = votedDelegates.map(v => {
				return `-${v}`;
			});
			vote.undoUnconfirmed(validTransaction, validSender, () => {
				checkAccountVotes(
					transaction.senderPublicKey,
					'unconfirmed',
					transaction.asset.votes,
					'undo',
					done
				);
			});
		});

		it('should undo add vote for delegate', done => {
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset.votes = votedDelegates.map(v => {
				return `+${v}`;
			});
			vote.undoUnconfirmed(transaction, validSender, () => {
				checkAccountVotes(
					transaction.senderPublicKey,
					'unconfirmed',
					transaction.asset.votes,
					'undo',
					done
				);
			});
		});
	});

	describe('objectNormalize', () => {
		it('should normalize object for valid transaction', () => {
			return expect(vote.objectNormalize(validTransaction)).to.eql(
				validTransaction
			);
		});

		it('should throw error for duplicate votes in a transaction', () => {
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset.votes.push(transaction.asset.votes[0]);
			return expect(() => {
				vote.objectNormalize(transaction);
			}).to.throw(
				'Failed to validate vote schema: Array items are not unique (indexes 0 and 3)'
			);
		});

		it('should return error when votes array is longer than maximum acceptable', () => {
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset.votes = Array(
				...Array(MAX_VOTES_PER_TRANSACTION + 1)
			).map(() => {
				return `+${lisk.cryptography.getKeys(randomUtil.password()).publicKey}`;
			});
			return expect(() => {
				vote.objectNormalize(transaction);
			}).to.throw(
				'Failed to validate vote schema: Array is too long (34), maximum 33'
			);
		});
	});

	describe('dbRead', () => {
		it('should read votes correct', () => {
			var rawVotes =
				'+9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f,+141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a,+3ff32442bb6da7d60c1b7752b24e6467813c9b698e0f278d48c43580da972135';
			return expect(
				vote.dbRead({
					v_votes: rawVotes,
				})
			).to.eql({
				votes: rawVotes.split(','),
			});
		});

		it('should return null if no votes are supplied', () => {
			return expect(
				vote.dbRead({
					v_votes: null,
				})
			).to.eql(null);
		});
	});

	describe('ready', () => {
		it('should return true for single signature transaction', () => {
			return expect(vote.ready(validTransaction, validSender)).to.equal(true);
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
