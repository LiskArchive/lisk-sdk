/* eslint-disable mocha/no-pending-tests */
const bootstrapStorage = require('../../../../../../src/modules/http_api/init_steps/bootstrap_storage');

describe('init_steps/bootstrap_storage', () => {
	let argument;
	const accountLimit = 3;

	beforeEach(async () => {
		argument = {
			components: {
				storage: {
					bootstrap: sinonSandbox.stub().resolves(true),
					entities: {
						Account: {
							extendDefaultOptions: sinonSandbox.stub(),
						},
					},
				},
				logger: {
					error: sinonSandbox.stub(),
				},
			},
		};
		return bootstrapStorage(argument, accountLimit);
	});

	it('should bootstrap the storage', async () => {
		expect(argument.components.storage.bootstrap).to.be.called;
	});
	it('should extend account entity limit', async () => {
		expect(
			argument.components.storage.entities.Account.extendDefaultOptions
		).to.be.calledWith({
			limit: accountLimit,
		});
	});
	it('should log error if there is any', async () => {
		const error = new Error('error');
		argument.components.storage.bootstrap.rejects(error);
		try {
			await bootstrapStorage(argument, accountLimit);
		} catch (err) {
			expect(err).to.have.property('message');
			expect(err.message).to.equal(error.message);
		}
		expect(argument.components.logger.error).to.be.calledWith(error);
	});
});
