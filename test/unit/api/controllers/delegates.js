const rewire = require('rewire');
const Bignum = require('../../helpers/bignum.js');

const DelegatesController = rewire('../../../../api/controllers/delegates.js');

describe('delegates/api', () => {
	const __private = {};
	let loggerStub;
	let storageStub;

	beforeEach(done => {
		storageStub = {
			entities: {
				account: {
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

		__private.getForgingStatistics = DelegatesController.__get__(
			'_getForgingStatistics'
		);
		__private.aggregateBlocksReward = DelegatesController.__get__(
			'_aggregateBlocksReward'
		);

		DelegatesController.__set__('logger', loggerStub);
		DelegatesController.__set__('storage', storageStub);
		done();
	});

	afterEach(() => {
		return sinonSandbox.restore();
	});

	describe('_getForgingStatistics()', () => {
		it('should fail if invalid address is passed', () => {
			storageStub.entities.account.getOne = sinonSandbox
				.stub()
				.resolves(undefined);
			return expect(
				__private.getForgingStatistics({ address: 'InvalidAddress' })
			).to.throw('Account not found');
		});

		it('should fail if non-delegate address is passed', () => {
			storageStub.entities.account.getOne = sinonSandbox.stub().resolves({
				isDelegate: false,
			});

			return expect(
				__private.getForgingStatistics({ address: 'NonDelegateAddress' })
			).to.throw('Account not a delegate');
		});

		it('should be ok if a valid delegate address is passed', async () => {
			storageStub.entities.account.getOne = sinonSandbox.stub().resolves({
				rewards: 1,
				fees: 2,
				count: 3,
				forged: 4,
			});

			const data = await __private.getForgingStatistics({
				address: 'aValidAddress',
			});
			expect(data).to.have.keys('count', 'rewards', 'fees', 'forged');
		});

		it('should return aggregated data if start and end filters are provided', async () => {
			const reward = {
				fees: 1,
				rewards: 2,
				count: 3,
			};

			sinonSandbox.stub(__private, 'aggregateBlocksReward').resolves(reward);

			const expectedReturn = {
				...reward,
				...{
					forged: new Bignum(reward.fees)
						.plus(new Bignum(reward.rewards))
						.toString(),
				},
			};

			const filters = {
				address: 'aValidAddress',
				start: 'start',
				end: 'end',
			};
			const data = await __private.getForgingStatistics(filters);
			expect(__private.aggregateBlocksReward).to.be.calledWithExactly(filters);
			expect(data).to.be.equal(expectedReturn);
		});

		it('should aggregate the data runtime if start is omitted', async () => {
			const reward = {
				fees: 1,
				rewards: 2,
				count: 3,
			};

			sinonSandbox.stub(__private, 'aggregateBlocksReward').resolves(reward);

			const expectedReturn = {
				...reward,
				...{
					forged: new Bignum(reward.fees)
						.plus(new Bignum(reward.rewards))
						.toString(),
				},
			};

			const filters = {
				address: 'aValidAddress',
				end: 'end',
			};
			const data = await __private.getForgingStatistics(filters);
			expect(__private.aggregateBlocksReward).to.be.calledWithExactly(filters);
			expect(data).to.be.equal(expectedReturn);
		});

		it('should aggregate the data runtime if end is omitted', async () => {
			const reward = {
				fees: 1,
				rewards: 2,
				count: 3,
			};

			sinonSandbox.stub(__private, 'aggregateBlocksReward').resolves(reward);

			const expectedReturn = {
				...reward,
				...{
					forged: new Bignum(reward.fees)
						.plus(new Bignum(reward.rewards))
						.toString(),
				},
			};

			const filters = {
				address: 'aValidAddress',
				start: 'start',
			};
			const data = await __private.getForgingStatistics(filters);
			expect(__private.aggregateBlocksReward).to.be.calledWithExactly(filters);
			expect(data).to.be.equal(expectedReturn);
		});

		it('should fetch data from accounts if both start and end are omitted', async () => {
			const getAccountResponse = {
				isDelegate: true,
				producedBlocks: 1,
				fees: 2,
				rewards: 4,
			};

			sinonSandbox.spy(__private, 'aggregateBlocksReward');
			sinonSandbox
				.stub(storageStub.entities.account.getOne)
				.resolve(getAccountResponse);

			const filters = {
				address: 'aValidAddress',
				start: 'start',
			};
			const data = await __private.getForgingStatistics(filters);
			expect(storageStub.entities.account.getOne).to.be.calledOnceWith({
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
			expect(__private.aggregateBlocksReward).to.not.have.been.called;
		});
	});

	describe('_aggregateBlocksReward()', async () => {
		it('should return error when account not found', () => {
			sinonSandbox
				.stub(storageStub.entities.account, 'getOne')
				.resolves(undefined);
			return expect(
				__private.aggregateBlocksReward({ address: '0L' })
			).to.throw('Account not found');
		});

		it('should return error when library.storage.entities.Account.delegateBlocksRewards fails', done => {
			storageStub.entities.account.delegateBlocksRewards = sinonSandbox
				.stub()
				.throws(['anError']);
			try {
				__private.aggregateBlocksReward({ address: '1L' });
			} catch (err) {
				expect(err).to.equal('Blocks#aggregateBlocksReward error');
				expect(loggerStub.error.args[0][0]).to.equal(['anError']);
				done();
			}
		});

		it('should return error when account is not a delegate', async done => {
			storageStub.entities.Account.delegateBlocksRewards = sinonSandbox
				.stub()
				.resolves([{ delegate: null }]);
			try {
				await __private.aggregateBlocksReward({ address: '1L' });
			} catch (err) {
				expect(err).to.equal('Account is not a delegate');
				done();
			}
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
