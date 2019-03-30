const rewire = require('rewire');
const Bignumber = require('bignumber.js');

const DelegatesController = rewire(
	'../../../../../../src/modules/http_api/controllers/delegates'
);

describe('delegates/api', () => {
	const __private = {};
	let loggerStub;
	let storageStub;
	let channelStub;
	let restoreAggregateBlocksReward;
	let restoreDelegateFormatter;
	let dummyBlock;
	let dummyDelegates;
	const blocksRewardReturnStub = {
		fees: 1,
		rewards: 2,
		count: 3,
	};
	const expectedForgingStatisticsResult = {
		...blocksRewardReturnStub,
		...{
			forged: new Bignumber(blocksRewardReturnStub.fees)
				.plus(new Bignumber(blocksRewardReturnStub.rewards))
				.toString(),
		},
	};
	let aggregateBlocksRewardStub;
	let delegateFormatterStub;

	beforeEach(done => {
		dummyBlock = {
			id: '9314232245035524467',
			height: 1,
		};

		dummyDelegates = [
			{
				username: 'genesis_100',
				vote: '9997431613722222',
			},
			{
				username: 'genesis_51',
				vote: '9997428613722222',
			},
		];

		storageStub = {
			entities: {
				Account: {
					getOne: sinonSandbox.stub().resolves({
						rewards: 1,
						fees: 2,
						producedBlocks: 3,
						isDelegate: 4,
					}),
					get: sinonSandbox.stub().resolves(dummyDelegates),
					delegateBlocksRewards: sinonSandbox.stub(),
				},
				Block: {
					get: sinonSandbox.stub().resolves([dummyBlock]),
				},
			},
		};

		loggerStub = {
			error: sinonSandbox.stub(),
		};

		channelStub = {
			invoke: sinonSandbox.stub().resolves(),
		};

		__private.getForgingStatistics = DelegatesController.__get__(
			'_getForgingStatistics'
		);
		__private.aggregateBlocksReward = DelegatesController.__get__(
			'_aggregateBlocksReward'
		);
		__private.getDelegates = DelegatesController.__get__('_getDelegates');
		__private.getForgers = DelegatesController.__get__('_getForgers');

		delegateFormatterStub = sinonSandbox.stub();

		aggregateBlocksRewardStub = sinonSandbox
			.stub()
			.resolves(blocksRewardReturnStub);

		new DelegatesController({
			components: {
				logger: loggerStub,
				storage: storageStub,
			},
			channel: channelStub,
		});

		restoreAggregateBlocksReward = DelegatesController.__set__(
			'_aggregateBlocksReward',
			aggregateBlocksRewardStub
		);
		restoreDelegateFormatter = DelegatesController.__set__(
			'delegateFormatter',
			delegateFormatterStub
		);
		done();
	});

	afterEach(() => {
		restoreAggregateBlocksReward();
		restoreDelegateFormatter();
		channelStub.invoke.resolves();
		return sinonSandbox.restore();
	});

	describe('constructor', () => {
		it('should assign storage', async () => {
			expect(DelegatesController.__get__('storage')).to.equal(storageStub);
		});

		it('should assign logger', async () => {
			expect(DelegatesController.__get__('logger')).to.equal(loggerStub);
		});

		it('should assign channel', async () => {
			expect(DelegatesController.__get__('channel')).to.equal(channelStub);
		});
	});

	describe('_getDelegates()', () => {
		const filters = {
			aFilter: 'aFilter',
		};
		const options = {
			anOption: 'anOption',
		};

		beforeEach(async () => {
			channelStub.invoke.resolves('supply');
			await __private.getDelegates(filters, options);
		});

		afterEach(async () => {
			channelStub.invoke.resolves(); // Restore channel.invoke return to default.
			storageStub.entities.Block.get.resolves([dummyBlock]);
		});

		it('should call storage.entities.Account.get() with exact arguments', async () => {
			expect(storageStub.entities.Account.get).to.be.calledWithExactly(
				{ isDelegate: true, ...filters },
				options
			);
		});

		it('should call storage.entities.Block.get()', async () => {
			expect(storageStub.entities.Block.get).to.be.calledWithExactly(
				{},
				{ sort: 'height:desc', limit: 1 }
			);
		});

		it('should call channel.invoke with chain:calculateSupply action if lastBlock.height is not 0', async () => {
			expect(channelStub.invoke).to.be.calledWithExactly(
				'chain:calculateSupply',
				{ height: dummyBlock.height }
			);
		});

		it('should assign 0 to supply if lastBlock.height is 0', async () => {
			storageStub.entities.Block.get.resolves([{ height: 0 }]);
			await __private.getDelegates();
			expect(delegateFormatterStub).to.be.calledWith(0);
		});

		it('should call delegatesFormatter', async () => {
			expect(delegateFormatterStub.callCount).to.equal(dummyDelegates.length);
		});

		it('should return data returned by the call to delegates.map()', async () => {
			sinonSandbox.stub(Array.prototype, 'map').returns(dummyDelegates);
			const result = await __private.getDelegates();
			expect(result).to.equal(dummyDelegates);
		});
	});

	describe('_getForgingStatistics()', () => {
		it('should fail if invalid address is passed', () => {
			storageStub.entities.Account.getOne.rejects({ code: 0 });
			return expect(
				__private.getForgingStatistics({ address: 'InvalidAddress' })
			).to.eventually.be.rejectedWith('Account not found');
		});

		it('should fail if no record is found on the database', () => {
			storageStub.entities.Account.getOne.rejects({ code: 0 });
			return expect(
				__private.getForgingStatistics({ address: 'InvalidAddress' })
			).to.eventually.be.rejectedWith('Account not found');
		});

		it('should fail if non-delegate address is passed', () => {
			storageStub.entities.Account.getOne.resolves({
				isDelegate: false,
			});

			return expect(
				__private.getForgingStatistics({ address: 'NonDelegateAddress' })
			).to.eventually.be.rejectedWith('Account is not a delegate');
		});

		it('should be ok if a valid delegate address is passed', async () => {
			storageStub.entities.Account.getOne.resolves({
				rewards: 1,
				fees: 2,
				producedBlocks: 3,
				forged: 4,
				isDelegate: true,
			});

			expect(
				__private.getForgingStatistics({ address: 'aValidAddress' })
			).to.eventually.have.keys('count', 'rewards', 'fees', 'forged');
		});

		it('should return aggregated data if start and end filters are provided', async () => {
			const filters = {
				address: 'aValidAddress',
				start: 'start',
				end: 'end',
			};
			const data = await __private.getForgingStatistics(filters);
			expect(aggregateBlocksRewardStub).to.be.deep.calledWith(filters);
			expect(data).to.deep.equal(expectedForgingStatisticsResult);
		});

		it('should aggregate the data runtime if start is omitted', async () => {
			const filters = {
				address: 'aValidAddress',
				end: 'end',
			};
			const data = await __private.getForgingStatistics(filters);
			expect(aggregateBlocksRewardStub).to.be.deep.calledWith(filters);
			expect(data).to.deep.equal(expectedForgingStatisticsResult);
		});

		it('should aggregate the data runtime if end is omitted', async () => {
			const filters = {
				address: 'aValidAddress',
				start: 'start',
			};
			const data = await __private.getForgingStatistics(filters);
			expect(aggregateBlocksRewardStub).to.be.deep.calledWith(filters);
			expect(data).to.deep.equal(expectedForgingStatisticsResult);
		});

		it('should fetch data from Accounts if both start and end are omitted', async () => {
			const getAccountResponse = {
				isDelegate: true,
				producedBlocks: 1,
				fees: 2,
				rewards: 4,
			};

			storageStub.entities.Account.getOne.resolves(getAccountResponse);

			const filters = {
				address: 'aValidAddress',
			};
			const data = await __private.getForgingStatistics(filters);
			expect(storageStub.entities.Account.getOne).to.be.calledWith({
				address: filters.address,
			});
			expect(data).to.deep.equal({
				rewards: getAccountResponse.rewards,
				fees: getAccountResponse.fees,
				count: new Bignumber(getAccountResponse.producedBlocks).toString(),
				forged: new Bignumber(getAccountResponse.rewards)
					.plus(new Bignumber(getAccountResponse.fees))
					.toString(),
			});
			expect(aggregateBlocksRewardStub).to.not.have.been.called;
		});
	});

	describe('_aggregateBlocksReward()', () => {
		it('should return account not found when using invalid address', () => {
			storageStub.entities.Account.getOne.rejects({ code: 0 });
			return expect(
				__private.aggregateBlocksReward({ address: '0L' })
			).to.eventually.be.rejectedWith('Account not found');
		});

		it('should return error when channel.invoke("getDelegateBlocksRewards" fails', async () => {
			channelStub.invoke.rejects({
				stack: ['anError'],
			});

			try {
				await __private.aggregateBlocksReward({ address: '1L' });
			} catch (err) {
				expect(err).to.deep.equal('Blocks#aggregateBlocksReward error');
				expect(loggerStub.error).to.be.calledWith(['anError']);
			}
		});

		it('should return error when account is not a delegate', () => {
			channelStub.invoke.resolves([{ delegate: null }]);
			return expect(
				__private.aggregateBlocksReward({ address: '1L' })
			).to.eventually.be.rejectedWith('Account is not a delegate');
		});

		it('should return aggregate blocks rewards', async () => {
			channelStub.invoke.resolves([
				{ delegate: '123abc', fees: 1, count: 100 },
			]);
			const data = await __private.aggregateBlocksReward({ address: '1L' });
			const expectedData = {
				fees: 1,
				count: 100,
				rewards: '0',
			};

			return expect(data).to.deep.equal(expectedData);
		});
	});

	describe('_getForgers()', () => {
		const filters = {
			aFilter: 'aFilter',
		};

		beforeEach(() => {
			channelStub.invoke.resolves(dummyDelegates);
			return __private.getForgers(filters);
		});

		it('should call storage.entities.Block.get() with exact arguments', async () => {
			expect(storageStub.entities.Block.get).to.be.calledWithExactly(
				{},
				{ sort: 'height:desc', limit: 1 }
			);
		});

		it('should call channel.invoke with chain:generateDelegateList action', async () => {
			expect(channelStub.invoke).to.be.calledWith('chain:generateDelegateList');
		});

		// TODO: Complete tests when generateDelegatesList doesn't use callbacks
		// Currently it's using a callback but not on the last argument so it can't
		// be promisified.
	});
});
