const Broadcaster = require('../../../logic/broadcaster');

describe('Broadcaster', () => {
	const force = true;
	let broadcaster;
	let broadcasts;
	let transactionStub;
	let peersStub;
	let loggerStub;

	before(done => {
		broadcasts = {
			broadcastInterval: 10000,
			releaseLimit: 10,
		};

		peersStub = {
			me: sinonSandbox.stub(),
		};

		transactionStub = {
			checkConfirmed: sinonSandbox.stub(),
		};

		loggerStub = {
			info: sinonSandbox.stub(),
			error: sinonSandbox.stub(),
		};

		broadcaster = new Broadcaster(
			broadcasts,
			force,
			peersStub,
			transactionStub,
			loggerStub
		);
		done();
	});

	describe('constructor', () => {
		it('should throw error with no params', () => {
			return expect(() => {
				new Broadcaster();
			})
				.to.throw()
				.to.be.instanceOf(Error);
		});

		it('should return Broadcaster instance', () => {
			expect(broadcaster).to.be.instanceOf(Broadcaster);
			expect(broadcaster)
				.to.have.property('queue')
				.that.is.an('Array');
			expect(broadcaster)
				.to.have.property('config')
				.that.is.an('object');
			return expect(broadcaster)
				.to.have.property('routes')
				.that.is.an('Array');
		});
	});
});
