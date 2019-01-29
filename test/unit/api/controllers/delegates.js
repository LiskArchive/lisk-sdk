const rewire = require('rewire');
const Bignum = require('../../../../helpers/bignum.js');
const BlockReward = require('../../../../logic/block_reward.js');

const DelegatesController = rewire('../../../../api/controllers/delegates.js');

describe('delegates/api', () => {
	const __private = {};
	let loggerStub;
	let storageStub;
	let modulesStub;
	let restoreRewire;
	const blocksRewardReturnStub = {
		fees: 1,
		rewards: 2,
		count: 3,
	};
	const expectedForgingStatisticsResult = {
		...blocksRewardReturnStub,
		...{
			forged: new Bignum(blocksRewardReturnStub.fees)
				.plus(new Bignum(blocksRewardReturnStub.rewards))
				.toString(),
		},
	};
	let aggregateBlocksRewardStub;

	beforeEach(done => {
		storageStub = {
			entities: {
				Account: {
					getOne: sinonSandbox.stub().resolves({
						rewards: 1,
						fees: 2,
						producedBlocks: 3,
						isDelegate: 4,
					}),
					delegateBlocksRewards: sinonSandbox.stub(),
				},
			},
		};

		loggerStub = {
			error: sinonSandbox.stub(),
		};

		modulesStub = sinonSandbox.stub();

		__private.getForgingStatistics = DelegatesController.__get__(
			'_getForgingStatistics'
		);
		__private.aggregateBlocksReward = DelegatesController.__get__(
			'_aggregateBlocksReward'
		);

		aggregateBlocksRewardStub = sinonSandbox
			.stub()
			.resolves(blocksRewardReturnStub);

		new DelegatesController({
			logger: loggerStub,
			storage: storageStub,
			modules: modulesStub,
		});

		restoreRewire = DelegatesController.__set__(
			'_aggregateBlocksReward',
			aggregateBlocksRewardStub
		);
		done();
	});

	afterEach(() => {
		restoreRewire();
		return sinonSandbox.restore();
	});

	describe('constructor', () => {
		it('should assign modules', () => {
			return expect(DelegatesController.__get__('logger')).to.equal(loggerStub);
		});

		it('should assign storage', () => {
			return expect(DelegatesController.__get__('storage')).to.equal(storageStub);
		});

		it('should assign logger', () => {
			return expect(DelegatesController.__get__('modules')).to.equal(modulesStub);
		});

		it('should assign blockReward', () => {
			return expect(DelegatesController.__get__('blockReward')).to.be.instanceOf(BlockReward);
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
				count: new Bignum(getAccountResponse.producedBlocks).toString(),
				forged: new Bignum(getAccountResponse.rewards)
					.plus(new Bignum(getAccountResponse.fees))
					.toString(),
			});
			expect(aggregateBlocksRewardStub).to.not.have.been.called;
		});
	});

	describe('_aggregateBlocksReward()', async () => {
		it('should return account not found when using invalid address', () => {
			storageStub.entities.Account.getOne.rejects({ code: 0 });
			return expect(
				__private.aggregateBlocksReward({ address: '0L' })
			).to.eventually.be.rejectedWith('Account not found');
		});

		it('should return error when library.storage.entities.Account.delegateBlocksRewards fails', async () => {
			storageStub.entities.Account.delegateBlocksRewards.throws({
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
			storageStub.entities.Account.delegateBlocksRewards = sinonSandbox
				.stub()
				.resolves([{ delegate: null }]);

			return expect(
				__private.aggregateBlocksReward({ address: '1L' })
			).to.eventually.be.rejectedWith('Account is not a delegate');
		});

		it('should return aggregate blocks rewards', async () => {
			storageStub.entities.Account.delegateBlocksRewards = sinonSandbox
				.stub()
				.resolves([{ delegate: '123abc', fees: 1, count: 100 }]);

			const data = await __private.aggregateBlocksReward({ address: '1L' });
			const expectedData = {
				fees: 1,
				count: 100,
				rewards: '0',
			};

			return expect(data).to.deep.equal(expectedData);
		});
	});
});
