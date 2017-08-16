'use strict';

// Utils
var _       = require('lodash');
var async   = require('async');
var chai    = require('chai');
var expect  = require('chai').expect;
var Promise = require('bluebird');
var rewire  = require('rewire');
var sinon   = require('sinon');

// Application specific
var bignum    = require('../../../helpers/bignum.js');
var config    = require('../../../config.json');
var constants = require('../../../helpers/constants');
var node      = require('../../node.js');
var Sequence  = require('../../../helpers/sequence.js');
var slots     = require('../../../helpers/slots.js');

describe('Rounds-related SQL triggers', function () {
	var library;
	var mem_state, delegates_state, round_blocks = [];
	var round_transactions = [];
	var delegatesList, keypairs;

	function normalizeMemAccounts (mem_accounts) {
		var accounts = {};
		_.map(mem_accounts, function (acc) {
			acc.balance = Number(acc.balance);
			acc.u_balance = Number(acc.u_balance);
			acc.fees = Number(acc.fees);
			accounts[acc.address] = acc;
		});
		return accounts;
	}

	function normalizeDelegates (db_delegates) {
		var delegates = {};
		_.map(db_delegates, function (d) {
			d.pk = d.pk.toString('hex');
			d.rank = Number(d.rank);
			d.fees = Number(d.fees);
			d.rewards = Number(d.rewards);
			d.voters_balance = Number(d.voters_balance);
			d.voters_cnt = Number(d.voters_cnt);
			d.blocks_forged_cnt = Number(d.blocks_forged_cnt);
			d.blocks_missed_cnt = Number(d.blocks_missed_cnt);
			delegates[d.pk] = d;
		});
		return delegates;
	}

	afterEach(function () {
		// Perform validation of mem_accounts balances against blockchain after every test
		return validateMemBalances()
			.then(function (results) {
				expect(results.length).to.equal(0);
			});
	});

	function getMemAccounts () {
		return library.db.query('SELECT * FROM mem_accounts').then(function (rows) {
			rows = normalizeMemAccounts(rows);
			mem_state = rows;
			return rows;
		});
	}

	function getDelegates (normalize) {
		return library.db.query('SELECT * FROM delegates').then(function (rows) {
			delegates_state = normalizeDelegates(rows);
			return rows;
		});
	}

	function getFullBlock(height) {
		return library.db.query('SELECT * FROM full_blocks_list WHERE b_height = ${height}', {height: height}).then(function (rows) {
			return rows;
		});
	}

	function getBlocks (round) {
		return library.db.query('SELECT * FROM blocks WHERE CEIL(height / 101::float)::int = ${round} AND height > 1 ORDER BY height ASC', {round: round}).then(function (rows) {
			return rows;
		});
	}

	function validateMemBalances () {
		return library.db.query('SELECT * FROM validateMemBalances()').then(function (rows) {
			return rows;
		});
	}

	function getRoundRewards (round) {
		return library.db.query('SELECT ENCODE(pk, \'hex\') AS pk, SUM(fees) AS fees, SUM(reward) AS rewards FROM rounds_rewards WHERE round = ${round} GROUP BY pk', {round: round}).then(function (rows) {
			var rewards = {};
			_.each(rows, function (row) {
				rewards[row.pk] = {
					pk: row.pk,
					fees: Number(row.fees),
					rewards: Number(row.rewards)
				};
			});
			return rewards;
		});
	}

	function getExpectedRoundRewards (blocks) {
		var rewards = {};

		var feesTotal = _.reduce(blocks, function (fees, block) {
			return new bignum(fees).plus(block.totalFee);
		}, 0);

		var rewardsTotal = _.reduce(blocks, function (reward, block) {
			return new bignum(reward).plus(block.reward);
		}, 0);

		var feesPerDelegate = new bignum(feesTotal.toPrecision(15)).dividedBy(slots.delegates).floor();
		var feesRemaining   = new bignum(feesTotal.toPrecision(15)).minus(feesPerDelegate.times(slots.delegates));

		node.debug('	Total fees: ' + feesTotal.toString() + ' Fees per delegates: ' + feesPerDelegate.toString() + ' Remaining fees: ' + feesRemaining + 'Total rewards: ' + rewardsTotal);
		
		_.each(blocks, function (block, index) {
			var pk = block.generatorPublicKey.toString('hex');
			if (rewards[pk]) {
				rewards[pk].fees = rewards[pk].fees.plus(feesPerDelegate);
				rewards[pk].rewards = rewards[pk].rewards.plus(block.reward);
			} else {
				rewards[pk] = {
					pk: pk,
					fees: new bignum(feesPerDelegate),
					rewards: new bignum(block.reward)
				};
			}

			if (index === blocks.length - 1) {
				// Apply remaining fees to last delegate
				rewards[pk].fees = rewards[pk].fees.plus(feesRemaining);
			}
		});

		_.each(rewards, function (delegate) {
			delegate.fees = Number(delegate.fees.toFixed());
			delegate.rewards = Number(delegate.rewards.toFixed());
		});

		return rewards;
	};

	before(function (done) {
		node.initApplication(function (scope) {
			library = scope;
			done();
		})
	});

	describe('genesisBlock', function () {
		var genesisBlock;
		var genesisAccount;
		var genesisAccounts;

		before(function () {
			// Get genesis accounts address - should be senderId from first transaction
			genesisAccount = library.genesisblock.block.transactions[0].senderId;

			// Get unique accounts from genesis block
			genesisAccounts = _.reduce(library.genesisblock.block.transactions, function (accounts, tx) {
				if (tx.senderId && accounts.indexOf(tx.senderId) === -1) {
					accounts.push(tx.senderId);
				}
				if (tx.recipientId && accounts.indexOf(tx.recipientId) === -1) {
					accounts.push(tx.recipientId);
				}
				return accounts;
			}, []);
		})

		it('should not populate mem_accounts', function () {
			return getMemAccounts().then(function (accounts) {
				expect(Object.keys(accounts).length).to.equal(0);
			});
		});

		it('should load genesis block with transactions into database (native)', function (done) {
			library.db.query('SELECT * FROM full_blocks_list WHERE b_height = 1').then(function (rows) {
				genesisBlock = library.modules.blocks.utils.readDbRows(rows)[0];
				expect(genesisBlock.id).to.equal(library.genesisblock.block.id);
				expect(genesisBlock.transactions.length).to.equal(library.genesisblock.block.transactions.length);
				done();
			}).catch(done);
		});

		it('should populate delegates table (native) and set data (trigger block_insert)', function () {
			return getDelegates().then(function () {
				_.each(delegates_state, function (delegate) {
					expect(delegate.tx_id).that.is.an('string');

					// Search for that transaction in genesis block
					var found = _.find(library.genesisblock.block.transactions, {id: delegate.tx_id});
					expect(found).to.be.an('object');

					expect(delegate.name).to.equal(found.asset.delegate.username);
					expect(delegate.address).to.equal(found.senderId);
					expect(delegate.pk).to.equal(found.senderPublicKey);
					
					// Data populated by trigger
					expect(delegate.rank).that.is.an('number');
					expect(delegate.voters_balance).to.equal(10000000000000000);
					expect(delegate.voters_cnt).to.equal(1);
					expect(delegate.blocks_forged_cnt).to.equal(0);
					expect(delegate.blocks_missed_cnt).to.equal(0);
				});
			});
		});

		it('should apply genesis block transactions to mem_accounts (native)', function () {
			// Wait 10 seconds for proper initialisation
			return Promise.delay(10000).then(function () {
				return getMemAccounts();
			}).then(function (accounts) {
				// Number of returned accounts should be equal to number of unique accounts in genesis block
				expect(Object.keys(accounts).length).to.equal(genesisAccounts.length);

				_.each(accounts, function (account) {
					if (account.address === genesisAccount) {
						// Genesis account should have negative balance
						expect(account.balance).to.be.below(0);
					} else if (account.isDelegate) {
						// Delegates accounts should have balances of 0
						expect(account.balance).to.be.equal(0);
					} else {
						// Other accounts (with funds) should have positive balance
						expect(account.balance).to.be.above(0);
					}
				});
			});
		});
	});

	describe('modules.delegates.__private.delegatesList', function () {

		// Results from Lisk-Core 0.9.3
		var expectedDelegatesOrder = [
			'948b8b509579306694c00833ec1c0f81e964487db2206ddb1517bfeca2b0dc1b',
			'f25af3c59ac7f5155c7a9f36762bd941b9dc9c5c051a1bc2d4e34ed773dd04a3',
			'74583aba9c0b92e4f08c8c75e6df341c255ca007971195ff64d6f909dc4b7177',
			'27f43391cca75cbc82d1750307649508d1d318cd015f1f172b97318f17ab954e',
			'6fb2e0882cd9d895e1e441b9f9be7f98e877aa0a16ae230ee5caceb7a1b896ae',
			'b5341e839b25c4cc2aaf421704c0fb6ba987d537678e23e45d3ca32454a2908c',
			'6d462852d410e84ca199a34d7ccad443784471f22cf3de37c531ce3b87ebbc41',
			'c4dfedeb4f639f749e498a2307f1545ddd6bda62e5503ac1832b122c4a5aedf9',
			'a50a55d4476bb118ba5121a07b51c185a8fe0a92b65840143b006b9820124df4',
			'1e82c7db09da2010e7f5fef24d83bc46238a20ef7ecdf12d9f32e4318a818777',
			'd8daea40fd098d4d546aa76b8e006ce4368c052ffe2c26b6eb843e925d54a408',
			'64db2bce729e302f6021047dfd39b6c53caf83b42da4b5b881cb153a3fb31613',
			'4bde949c19a0803631768148019473929b5f8661e9e48efb8d895efa9dd24aef',
			'5f6cc5a8aac752d37c676b0d46a798f7625e37dfa1e96091983274e04ab7ffe2',
			'03e811dda4f51323ac712cd12299410830d655ddffb104f2c9974d90bf8c583a',
			'9986cedd4b5a28e4c81d9b4bff0461dddaa25099df00b8632fe99e88df28ce73',
			'3ff32442bb6da7d60c1b7752b24e6467813c9b698e0f278d48c43580da972135',
			'3ea481498521e9fb1201b2295d0e9afa826ac6a3ef51de2f00365f915ac7ac06',
			'f9f6ff873c10c24eba834be28a56415a49c9c67b7c0ee9f106da827847168986',
			'0186d6cbee0c9b1a9783e7202f57fc234b1d98197ada1cc29cfbdf697a636ef1',
			'f62062b7590d46f382fb8c37a26ab0a1bd512951777aedcaa96822230727d3a1',
			'f827f60366fae9f9ed65384979de780f4a18c6dbfbefb1c7d100957dde51a06d',
			'07935c642c7409c365258c8488760e96a851cee618aec72eeeb135c9c827f0f9',
			'640dfec4541daed209a455577d7ba519ad92b18692edd9ae71d1a02958f47b1b',
			'e818ac2e8e9ffacd2d49f0f2f6739e16711644194d10bb1a8e9e434603125fa1',
			'bf9f5cfc548d29983cc0dfa5c4ec47c66c31df0f87aa669869678996902ab47f',
			'01389197bbaf1afb0acd47bbfeabb34aca80fb372a8f694a1c0716b3398db746',
			'904c294899819cce0283d8d351cb10febfa0e9f0acd90a820ec8eb90a7084c37',
			'a10f963752b3a44702dfa48b429ac742bea94d97849b1180a36750df3a783621',
			'8a0bcba8e909036b7a0fdb244f049d847b117d871d203ef7cc4c3917c94fd5fd',
			'fc8672466cc16688b5e239a784cd0e4c0acf214af039d9b2bf7a006da4043883',
			'6e904b2f678eb3b6c3042acb188a607d903d441d61508d047fe36b3c982995c8',
			'910da2a8e20f25ccbcb029fdcafd369b43d75e5bc4dc6d92352c29404acc350f',
			'ba7acc3bcbd47dbf13d744e57f696341c260ce2ea8f332919f18cb543b1f3fc7',
			'31402977c7eaf9e38d18d0689a45d719d615de941f7e80f6db388453b46f4df5',
			'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
			'19ffdf99dee16e4be2db4b0e000b56ab3a4e10bee9f457d8988f75ff7a79fc00',
			'6f04988de7e63537c8f14e84b0eb51e0ea9c5da8b4b9256243b3e40b1aeccb76',
			'da673805f349faf9ca1db167cb941b27f4517a36d23b3c21da4159cff0045fbe',
			'68680ca0bcd4676489976837edeac305c34f652e970386013ef26e67589a2516',
			'e13a0267444e026fe755ec128858bf3c519864631e0e4c474ba33f2470a18b83',
			'96c16a6251e1b9a8c918d5821a5aa8dfb9385607258338297221c5a226eca5c6',
			'f7b9751d59dd6be6029aa36a81a3f6436e2970cf4348845ab6254678fb946c18',
			'2f9b9a43b915bb8dcea45ea3b8552ebec202eb196a7889c2495d948e15f4a724',
			'73fec19d4bfe361c0680a7cfd24b3f744a1c1b29d932c4d89ce6157679f8af7d',
			'85b07e51ffe528f272b7eb734d0496158f2b0f890155ebe59ba2989a8ccc9a49',
			'526931663cbee883ff22369172cba091a5dd5fa1200284fa790d7aeca53d37af',
			'b137de324fcc79dd1a21ae39a2ee8eed05e76b86d8e89d378f8bb766afb8719f',
			'c3d1bc76dea367512df3832c437c7b2c95508e140f655425a733090da86fb82d',
			'86499879448d1b0215d59cbf078836e3d7d9d2782d56a2274a568761bff36f19',
			'55405aed8c3a1eabe678be3ad4d36043d6ef8e637d213b84ee703d87f6b250ed',
			'9a7452495138cf7cf5a1564c3ef16b186dd8ab4f96423f160e22a3aec6eb614f',
			'e42bfabc4a61f02131760af5f2fa0311007932a819a508da25f2ce6af2468156',
			'141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a',
			'9f2fcc688518324273da230afff9756312bf23592174896fab669c2d78b1533c',
			'47c8b3d6a9e418f0920ef58383260bcd04799db150612d4ff6eb399bcd07f216',
			'5c4af5cb0c1c92df2ed4feeb9751e54e951f9d3f77196511f13e636cf6064e74',
			'd3e3c8348bca51461eabfc382f8a01e8e284db54104ad37ec0695d48ae5531ac',
			'cf8a3bf23d1936a34facc4ff63d86d21cc2e1ac17e0010035dc3ef7ae85010dc',
			'9a0f19e60581003b70291cf4a874e8217b04871e676b2c53c85a18ab95c2683b',
			'aa33af13b440746b4f24312cba5fa910eb077ce6b16b84ebb482cb7720b5c686',
			'0779ca873bbda77f2850965c8a3a3d40a6ee4ec56af55f0a3f16c7c34c0f298b',
			'9c16751dbe57f4dff7b3fb8911a62c0cb2bdee6240e3f3fefe76832788cb14c6',
			'94b163c5a5ad346db1c84edaff51604164476cf78b8834b6b610dd03bd6b65d9',
			'a10ed9c59dac2c4b8264dc34f2d318719fb5f20ecdd8d6be2d7abfe32294f20d',
			'f33f93aa1f3ddcfd4e42d3206ddaab966f7f1b6672e5096d6da6adefd38edc67',
			'1cc68fa0b12521158e09779fd5978ccc0ac26bf99320e00a9549b542dd9ada16',
			'e6d075e3e396673c853210f74f8fe6db5e814c304bb9cd7f362018881a21f76c',
			'eabfe7093ef2394deb1b84287f2ceb1b55fe638edc3358a28fc74f64b3498094',
			'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
			'76c9494237e608d43fd6fb0114106a7517f5503cf79d7482db58a02304339b6c',
			'399a7d14610c4da8800ed929fc6a05133deb8fbac8403dec93226e96fa7590ee',
			'9503d36c0810f9ac1a9d7d45bf778387a2baab151a45d77ac1289fbe29abb18f',
			'031e27beab583e2c94cb3167d128fc1a356c1ae88adfcfaa2334abffa3ae0b4c',
			'ba2ea5e324eeb42fa6f4d1132a1d79911721e8507033bb0abd49715f531877b4',
			'cdd68a321ea737e82bce23d2208040f79471d36f2e6f84c74ea36ab26245e522',
			'95ea7eb026e250741be85e3593166ef0c4cb3a6eb9114dba8f0974987f10403f',
			'd1c3a2cb254554971db289b917a665b5c547617d6fd20c2d6051bc5dfc805b34',
			'b6ac700bf890b887e218dbd55b8f6b091dfc5a684d0fd7a6f69db7dc0313b51b',
			'c61d0822bbdbfe2a0b5503daff0ce8441c623115c94c0cfcf047a51f8b7160d3',
			'4fe5cd087a319956ddc05725651e56486961b7d5733ecd23e26e463bf9253bb5',
			'edbb9828fbe62da2a59afbc8623e8ebc5ed2f9b7f77a0cd1cdcf55edea30521c',
			'2b6f49383af36fd9f1a72d5d2708c8c354add89aaea7edc702c420e2d5fdf22e',
			'db821a4f828db977c6a8d186cc4a44280a6ef6f54ac18ec9eb32f78735f38683',
			'1b5a93c7622c666b0228236a70ee1a31407828b71bfb6daaa29a1509e87d4d3c',
			'b00269bd169f0f89bd2f278788616521dd1539868ced5a63b652208a04ee1556',
			'1af35b29ca515ff5b805a5e3a0ab8c518915b780d5988e76b0672a71b5a3be02',
			'3476bba16437ee0e04a29daa34d753139fbcfc14152372d7be5b7c75d51bac6c',
			'82174ee408161186e650427032f4cfb2496f429b4157da78888cbcea39c387fc',
			'a796e9c0516a40ccd0eee7a32fdc2dc297fee40a9c76fef9c1bb0cf41ae69750',
			'47b9b07df72d38c19867c6a8c12429e6b8e4d2be48b27cd407da590c7a2af0dc',
			'386217d98eee87268a54d2d76ce9e801ac86271284d793154989e37cb31bcd0e',
			'62bbb3c41e43df73de2c3f87e6577d095b84cf6deb1b2d6e87612a9156b980f8',
			'6164b0cc68f8de44cde90c78e838b9ee1d6041fa61cf0cfbd834d76bb369a10e',
			'1e6ce18addd973ad432f05f16a4c86372eaca054cbdbcaf1169ad6df033f6b85',
			'644a971f2c0d0d4b657d050fca27e5f9265e3dfa02a71f7fbf834cc2f2a6a4c8',
			'5d28e992b80172f38d3a2f9592cad740fd18d3c2e187745cd5f7badf285ed819',
			'67651d29dc8d94bcb1174d5bd602762850a89850503b01a5ffde3b726b43d3d2',
			'3be2eb47134d5158e5f7d52076b624b76744b3fba8aa50791b46ba21408524c9',
			'fab7b58be4c1e9542c342023b52e9d359ea89a3af34440bdb97318273e8555f0',
			'19d55c023d85d6061d1e196fa440a50907878e2d425bcd893366fa04bc23b4de'
		];

		before(function () {
			delegatesList = library.rewiredModules.delegates.__get__('__private.delegatesList');
		});

		it('should be an array', function () {
			expect(delegatesList).to.be.an('array');
		});

		it('should have a length of 101', function () {
			expect(delegatesList.length).to.equal(101);
		});

		it('should contain public keys of all 101 genesis delegates (pg-notify)', function () {
			_.each(delegatesList, function (pk) {
				// Search for that pk in genesis block
				var found = _.find(library.genesisblock.block.transactions, {senderPublicKey: pk});
				expect(found).to.be.an('object');
			});
		});

		it('should be equal to one generated with Lisk-Core 0.9.3', function () {
			expect(delegatesList).to.deep.equal(expectedDelegatesOrder);
		});
	});

	describe('round', function () {
		var round_mem_acc, round_delegates;
		var deleteLastBlockPromise;
		var outsider_pk = '948b8b509579306694c00833ec1c0f81e964487db2206ddb1517bfeca2b0dc1b';

		before(function () {
			// Copy initial round states for later comparison
			round_mem_acc = _.clone(mem_state);
			round_delegates = _.clone(delegates_state);

			deleteLastBlockPromise = Promise.promisify(library.modules.blocks.chain.deleteLastBlock);
		})

		function addTransaction (transaction, cb) {
			node.debug('	Add transaction ID: ' + transaction.id);
			// Add transaction to transactions pool - we use shortcut here to bypass transport module, but logic is the same
			// See: modules.transport.__private.receiveTransaction
			transaction = library.logic.transaction.objectNormalize(transaction);
			// Add transaction to round_transactions
			round_transactions.push(transaction);
			library.balancesSequence.add(function (sequenceCb) {
				library.modules.transactions.processUnconfirmedTransaction(transaction, true, function (err) {
					if (err) {
						return setImmediate(sequenceCb, err.toString());
					} else {
						return setImmediate(sequenceCb, null, transaction.id);
					}
				});
			}, cb);
		}

		function getNextForger(offset) {
			offset = !offset ? 1 : offset;

			var last_block = library.modules.blocks.lastBlock.get();
			var slot = slots.getSlotNumber(last_block.timestamp);
			return library.rewiredModules.delegates.__get__('__private.delegatesList')[(slot + offset) % slots.delegates];
		}

		function forge (cb) {
			var transactionPool = library.rewiredModules.transactions.__get__('__private.transactionPool');

			async.series([
				transactionPool.fillPool,
				function (seriesCb) {
					var last_block = library.modules.blocks.lastBlock.get();
					var slot = slots.getSlotNumber(last_block.timestamp) + 1;
					var delegate = getNextForger();
					var keypair = keypairs[delegate];
					node.debug('		Last block height: ' + last_block.height + ' Last block ID: ' + last_block.id + ' Last block timestamp: ' + last_block.timestamp + ' Next slot: ' + slot + ' Next delegate PK: ' + delegate + ' Next block timestamp: ' + slots.getSlotTime(slot));
					library.modules.blocks.process.generateBlock(keypair, slots.getSlotTime(slot), function (err) {
						if (err) { return seriesCb(err); }
						last_block = library.modules.blocks.lastBlock.get();
						node.debug('		New last block height: ' + last_block.height + ' New last block ID: ' + last_block.id);
						return seriesCb(err);
					});
				}
			], function (err) {
				cb(err);
			});
		}

		function addTransactionsAndForge (transactions, cb) {
			async.waterfall([
				function addTransactions (waterCb) {
					async.eachSeries(transactions, function (transaction, eachSeriesCb) {
						addTransaction(transaction, eachSeriesCb);
					}, waterCb);
				},
				forge
			], function (err) {
				cb(err);
			});
		}

		function tickAndValidate (transactions) {
			var last_block = library.modules.blocks.lastBlock.get();

			return Promise.promisify(addTransactionsAndForge)(transactions)
				.then(function () {
					var new_block = library.modules.blocks.lastBlock.get();
					expect(new_block.id).to.not.equal(last_block.id);
					last_block = new_block;
					round_blocks.push(new_block);
				})
				.then(getMemAccounts)
				.then(function (accounts) {
					var expected_mem_state = expectedMemState(transactions);
					expect(accounts).to.deep.equal(expected_mem_state);
				})
				.then(getDelegates)
				.then(function () {
					var expected_delegates_state = expectedDelegatesState();
					expect(delegates_state).to.deep.equal(expected_delegates_state);
				});
		}

		function expectedMemState (transactions) {
			_.each(transactions, function (tx) {
				var last_block = library.modules.blocks.lastBlock.get();

				var address = tx.senderId
				if (mem_state[address]) {
					// Update sender
					mem_state[address].balance -= (tx.fee+tx.amount);
					mem_state[address].u_balance -= (tx.fee+tx.amount);
					mem_state[address].blockId = last_block.id;
					mem_state[address].virgin = 0;
				}

				address = tx.recipientId;
				if (mem_state[address]) {
					// Update recipient
					mem_state[address].balance += tx.amount;
					mem_state[address].u_balance += tx.amount;
					mem_state[address].blockId = last_block.id;
				} else {
					// Funds sent to new account
					mem_state[address] = {
						address: address,
						balance: tx.amount,
						blockId: last_block.id,
						delegates: null,
						fees: 0,
						isDelegate: 0,
						missedblocks: 0,
						multilifetime: 0,
						multimin: 0,
						multisignatures: null,
						nameexist: 0,
						producedblocks: 0,
						publicKey: null,
						rate: '0',
						rewards: '0',
						secondPublicKey: null,
						secondSignature: 0,
						u_balance: tx.amount,
						u_delegates: null,
						u_isDelegate: 0,
						u_multilifetime: 0,
						u_multimin: 0,
						u_multisignatures: null,
						u_nameexist: 0,
						u_secondSignature: 0,
						u_username: null,
						username: null,
						virgin: 1,
						vote: '0'
					}
				}
			});
			return mem_state;
		}

		function expectedDelegatesState () {
			var last_block = library.modules.blocks.lastBlock.get();
			_.each(delegates_state, function (delegate) {
				if (delegate.pk === last_block.generatorPublicKey) {
					delegate.blocks_forged_cnt += 1;
				}
			});
			return delegates_state;
		}

		before(function () {
			return Promise.delay(1000).then(function () {
				// Set delegates module as loaded to allow manual forging
				library.rewiredModules.delegates.__set__('__private.loaded', true);
			});
		});

		it('should load all secrets of 101 delegates and set modules.delegates.__private.keypairs (native)', function (done) {
			var loadDelegates = library.rewiredModules.delegates.__get__('__private.loadDelegates');
			loadDelegates(function (err) {
				keypairs = library.rewiredModules.delegates.__get__('__private.keypairs');
				expect(Object.keys(keypairs).length).to.equal(config.forging.secret.length);
				_.each(keypairs, function (keypair, pk) {
					expect(keypair.publicKey).to.be.instanceOf(Buffer);
					expect(keypair.privateKey).to.be.instanceOf(Buffer);
					expect(pk).to.equal(keypair.publicKey.toString('hex'));
				});
				done(err);
			});
		});

		it('should forge block with 1 TRANSFER transaction to random account, update mem_accounts (native) and delegates (trigger block_insert_delete) tables', function () {
			var transactions = [];
			var tx = node.lisk.transaction.createTransaction(
				node.randomAccount().address,
				node.randomNumber(100000000, 1000000000),
				node.gAccount.password
			);
			transactions.push(tx);

			return tickAndValidate(transactions);
		});

		it('should forge block with 25 TRANSFER transactions to random accounts, update mem_accounts (native) and delegates (trigger block_insert_delete) tables', function () {
			var tx_cnt = 25;
			var transactions = [];

			for (var i = tx_cnt - 1; i >= 0; i--) {
				var tx = node.lisk.transaction.createTransaction(
					node.randomAccount().address,
					node.randomNumber(100000000, 1000000000),
					node.gAccount.password
				);
				transactions.push(tx);
			}

			return tickAndValidate(transactions);
		});

		it('should forge 98 blocks with 1 TRANSFER transaction each to random account, update mem_accounts (native) and delegates (trigger block_insert_delete) tables', function (done) {
			var blocks_cnt = 98;
			var blocks_processed = 0;
			var tx_cnt = 1;

			async.doUntil(function (untilCb) {
				++blocks_processed;
				var transactions = [];
				for (var t = tx_cnt - 1; t >= 0; t--) {
					var tx = node.lisk.transaction.createTransaction(
						node.randomAccount().address,
						node.randomNumber(100000000, 1000000000),
						node.gAccount.password
					);
					transactions.push(tx);
				}
				node.debug('	Processing block ' + blocks_processed + ' of ' + blocks_cnt + ' with ' + transactions.length + ' transactions');

				tickAndValidate(transactions).then(untilCb).catch(untilCb);
			}, function (err) {
				return err || blocks_processed >= blocks_cnt;
			}, done);
		});

		it('should calculate rewards for round 1 correctly - all should be the same (native, rounds_rewards, delegates)', function () {
			var round = 1;
			var expectedRewards;

			return Promise.join(getBlocks(round), getRoundRewards(round), getDelegates(), function (blocks, rewards, delegates) {
				// Get expected rewards for round (native)
				expectedRewards = getExpectedRoundRewards(blocks);
				// Rewards from database table rounds_rewards should match native rewards
				expect(rewards).to.deep.equal(expectedRewards);

				expect(delegates_state[outsider_pk].blocks_missed_cnt).to.equal(1);
				return Promise.reduce(delegates, function (delegates, d) {
					if (d.fees > 0 || d.rewards > 0) {
						// Normalize database data
						delegates[d.pk] = {
							pk: d.pk,
							fees: Number(d.fees),
							rewards: Number(d.rewards)
						}
					}
					return delegates;
				}, {})
				.then(function (delegates) {
					expect(delegates).to.deep.equal(expectedRewards);
				});
			});
		});

		it('should generate a different delegate list than one generated at the beginning of round 1', function () {
			var tmpDelegatesList = library.rewiredModules.delegates.__get__('__private.delegatesList');
			expect(tmpDelegatesList).to.not.deep.equal(delegatesList);
		});

		describe('Delete last block of round 1, block contain 1 transaction type SEND', function () {
			var round = 1;

			it('round rewards should be empty (rewards for round 1 deleted from rounds_rewards table)', function () {
				return deleteLastBlockPromise().then(function () {
					return getRoundRewards(round);
				}).then(function (rewards) {
					expect(rewards).to.deep.equal({});
				});
			});

			it('delegates table should be equal to one generated at the beginning of round 1 with updated blocks_forged_cnt', function () {
				return Promise.join(getDelegates(), getBlocks(round), function (delegates, blocks) {
					// Apply blocks_forged_cnt to round_delegates
					_.each(blocks, function (block) {
						round_delegates[block.generatorPublicKey.toString('hex')].blocks_forged_cnt += 1;
					});
					expect(delegates_state).to.deep.equal(round_delegates);
				});
			});

			it('mem_accounts table should not contain changes from transaction included in deleted block', function () {
				return getMemAccounts()
					.then(function (accounts) {
						var last_transaction = round_transactions[round_transactions.length - 1];
						last_transaction.amount = -last_transaction.amount;
						last_transaction.fees = -last_transaction.fee;
						var expected_mem_state = expectedMemState([last_transaction]);
						expect(accounts).to.deep.equal(expected_mem_state);
					});
			});

			it('delegates list should be equal to one generated at the beginning of round 1', function () {
				var newDelegatesList = library.rewiredModules.delegates.__get__('__private.delegatesList');
				expect(newDelegatesList).to.deep.equal(delegatesList);
			});
		});

		describe('Round rollback (table delegates) when forger of last block of round is unvoted', function() {
			var last_block_forger;

			before(function () {
				// Set last block forger
				last_block_forger = getNextForger();
				// Delete one block more
				return deleteLastBlockPromise();
			});

			it('last block height should be at height 99 after deleting one more block', function () {
				var last_block = library.modules.blocks.lastBlock.get();
				expect(last_block.height).to.equal(99);
			});

			it('expected forger of last block of round should have proper votes', function () {
				return getDelegates()
					.then(function () {
						var delegate = delegates_state[last_block_forger];
						expect(delegate.voters_balance).to.equal(10000000000000000);
						expect(delegate.voters_cnt).to.equal(1);
					});
			});

			it('should unvote expected forger of last block of round', function () {
				var transactions = [];
				var tx = node.lisk.vote.createVote(
					node.gAccount.password,
					['-' + last_block_forger]
				);
				transactions.push(tx);

				return tickAndValidate(transactions)
					.then(function () {
						var last_block = library.modules.blocks.lastBlock.get();
						return getFullBlock(last_block.height);
					})
					.then(function (rows) {
						// Normalize blocks
						var blocks = library.modules.blocks.utils.readDbRows(rows);
						expect(blocks[0].transactions[0].asset.votes[0]).to.equal('-' + last_block_forger);
					});
			});

			it('after finishing round, delegates list should be different than one generated at the beginning of round 1', function () {
				var transactions = [];

				return tickAndValidate(transactions)
					.then(function () {
						var tmpDelegatesList = library.rewiredModules.delegates.__get__('__private.delegatesList');
						expect(tmpDelegatesList).to.not.deep.equal(delegatesList);
					});
			});

			it('forger of last block of previous round should have voters_balance and voters_cnt 0', function () {
				return getDelegates()
					.then(function () {
						expect(delegates_state[outsider_pk].blocks_missed_cnt).to.equal(1);
						var delegate = delegates_state[last_block_forger];
						expect(delegate.voters_balance).to.equal(0);
						expect(delegate.voters_cnt).to.equal(0);
					});
			});

			it('after deleting last block of round, delegates list should be equal to one generated at the beginning of round 1', function () {
				return deleteLastBlockPromise().delay(20)
					.then(function () {
						var tmpDelegatesList = library.rewiredModules.delegates.__get__('__private.delegatesList');
						expect(tmpDelegatesList).to.deep.equal(delegatesList);
					});
			});

			it('expected forger of last block of round should have proper votes again', function () {
				return getDelegates()
					.then(function () {
						expect(delegates_state[outsider_pk].blocks_missed_cnt).to.equal(0);
						var delegate = delegates_state[last_block_forger];
						expect(delegate.voters_balance).to.equal(10000000000000000);
						expect(delegate.voters_cnt).to.equal(1);
					});
			});
		});

		describe('Round rollback (table delegates) when forger of last block of round is replaced in last block of round', function() {
			var last_block_forger, tmp_account;

			before(function () {
				// Set last block forger
				last_block_forger = getNextForger();
				// Delete two blocks more
				return deleteLastBlockPromise()
					.then(function () {
						return deleteLastBlockPromise();
					})
					.then(function () {
						// Fund random account
						var transactions = [];
						tmp_account = node.randomAccount();
						var tx = node.lisk.transaction.createTransaction(tmp_account.address, 5000000000, node.gAccount.password);
						transactions.push(tx);
						return tickAndValidate(transactions);
					})
					.then(function () {
						// Register random delegate
						var transactions = [];
						var tx = node.lisk.delegate.createDelegate(tmp_account.password, 'my_little_delegate');
						transactions.push(tx);
						return tickAndValidate(transactions);
					});
			});

			it('last block height should be at height 100', function () {
				var last_block = library.modules.blocks.lastBlock.get();
				expect(last_block.height).to.equal(100);
			});

			it('after finishing round, should unvote expected forger of last block of round and vote new delegate', function () {
				var transactions = [];
				var tx = node.lisk.vote.createVote(
					node.gAccount.password,
					['-' + last_block_forger, '+' + tmp_account.publicKey]
				);
				transactions.push(tx);

				return tickAndValidate(transactions)
					.then(function () {
						var last_block = library.modules.blocks.lastBlock.get();
						return getFullBlock(last_block.height);
					})
					.then(function (rows) {
						// Normalize blocks
						var blocks = library.modules.blocks.utils.readDbRows(rows);
						expect(blocks[0].transactions[0].asset.votes).to.deep.equal(['-' + last_block_forger, '+' + tmp_account.publicKey]);
					});
			});

			it('delegates list should be different than one generated at the beginning of round 1', function () {
				var tmpDelegatesList = library.rewiredModules.delegates.__get__('__private.delegatesList');
				expect(tmpDelegatesList).to.not.deep.equal(delegatesList);
			});

			it('unvoted delegate should not be on list', function () {
				var tmpDelegatesList = library.rewiredModules.delegates.__get__('__private.delegatesList');
				expect(tmpDelegatesList).to.not.contain(last_block_forger);
			});

			it('delegate who replaced unvoted one should be on list', function () {
				var tmpDelegatesList = library.rewiredModules.delegates.__get__('__private.delegatesList');
				expect(tmpDelegatesList).to.contain(tmp_account.publicKey);
			});

			it('forger of last block of previous round should have voters_balance and voters_cnt 0', function () {
				return getDelegates()
					.then(function () {
						expect(delegates_state[outsider_pk].blocks_missed_cnt).to.equal(1);
						var delegate = delegates_state[last_block_forger];
						expect(delegate.voters_balance).to.equal(0);
						expect(delegate.voters_cnt).to.equal(0);
					});
			});

			it('delegate who replaced last block forger should have proper votes', function () {
				return getDelegates()
					.then(function () {
						var delegate = delegates_state[tmp_account.publicKey];
						expect(delegate.voters_balance).to.be.above(0);
						expect(delegate.voters_cnt).to.equal(1);
					});
			});

			it('after deleting last block of round, delegates list should be equal to one generated at the beginning of round 1', function () {
				return deleteLastBlockPromise().delay(20)
					.then(function () {
						var tmpDelegatesList = library.rewiredModules.delegates.__get__('__private.delegatesList');
						expect(tmpDelegatesList).to.deep.equal(delegatesList);
					});
			});

			it('expected forger of last block of round should have proper votes again', function () {
				return getDelegates()
					.then(function () {
						expect(delegates_state[outsider_pk].blocks_missed_cnt).to.equal(0);
						var delegate = delegates_state[last_block_forger];
						expect(delegate.voters_balance).to.equal(10000000000000000);
						expect(delegate.voters_cnt).to.equal(1);
					});
			});

			it('delegate who replaced last block forger should have voters_balance and voters_cnt 0', function () {
				return getDelegates()
					.then(function () {
						var delegate = delegates_state[tmp_account.publicKey];
						expect(delegate.voters_balance).to.equal(0);
						expect(delegate.voters_cnt).to.equal(0);
					});
			});
		});

		describe('Rounds rewards consistency - round 2', function() {
			var expected_reward;
			var round;

			before(function (done) {
				// Set expected reward per block as first milestone
				expected_reward = constants.rewards.milestones[0];
				// Get height of last block
				var current_height = library.modules.blocks.lastBlock.get().height;
				// Calculate how many block to forge before rewards start
				var blocks_to_forge = constants.rewards.offset - current_height - 1; // 1 block before rewards start, so we can check
				var blocks_processed = 0;

				async.doUntil(function (untilCb) {
					++blocks_processed;
					node.debug('	Processing block ' + blocks_processed + ' of ' + blocks_to_forge);

					tickAndValidate([]).then(untilCb).catch(untilCb);
				}, function (err) {
					return err || blocks_processed >= blocks_to_forge;
				}, done);
			});

			it('block just before rewards start should have 0 reward', function () {
				var last_block = library.modules.blocks.lastBlock.get();
				expect(last_block.reward).to.equal(0);
			});

			it('all blocks from now until round end should have proper rewards (' + expected_reward + ')', function (done) {
				var blocks_processed = 0;
				var last_block;

				// Forge blocks until end of a round
				async.doUntil(function (untilCb) {
					++blocks_processed;
					node.debug('	Processing block ' + blocks_processed);

					tickAndValidate([]).then(function () {
						last_block = library.modules.blocks.lastBlock.get();
						// All blocks from now should have proper rewards
						expect(last_block.reward).to.equal(expected_reward);
						untilCb();
					}).catch(untilCb);
				}, function (err) {
					return err || last_block.height % 101 === 0;
				}, done);
			});

			it('rewards from table rounds_rewards should match rewards from blockchian', function () {
				var last_block = library.modules.blocks.lastBlock.get();
				round = slots.calcRound(last_block.height);

				return Promise.join(getBlocks(round), getRoundRewards(round), getDelegates(), function (blocks, rewards) {
					// Get expected rewards for round (native)
					var expectedRewards = getExpectedRoundRewards(blocks);
					// Rewards from database table rounds_rewards should match native rewards
					expect(rewards).to.deep.equal(expectedRewards);
				});
			});

			it('rewards from table delegates should match rewards from blockchain', function () {
				var blocks_rewards, delegates_rewards;
				return Promise.join(getBlocks(round), getDelegates(), function (blocks, delegates) {
					return Promise.reduce(delegates, function (delegates, d) {
						// Skip delegates who not forged
						if (d.blocks_forged_cnt) {
							delegates[d.pk] = {
								pk: d.pk,
								rewards: Number(d.rewards)
							}
						}
						return delegates;
					}, {})
					.then(function (delegates) {
						delegates_rewards = delegates;
						return Promise.reduce(blocks, function (blocks, b) {
							var pk;
							pk = b.generatorPublicKey.toString('hex');
							if (blocks[pk]) {
								blocks.rewards += Number(b.reward);
							} else {
								blocks[pk] = {
									pk: pk,
									rewards: Number(b.reward)
								}
							}
							return blocks;
						}, {})
						.then (function (blocks) {
							expect(delegates_rewards).to.deep.equal(blocks);
						});
					});
				});
			});
		});
	});
});
