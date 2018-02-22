const Broadcaster = require('../../../logic/broadcaster');

describe('Broadcaster', () => {
	const force = true;
	const params = { limit: 10, broadhash: '123' };
	let broadcaster;
	let broadcasts;
	let transactionStub;
	let peersStub;
	let loggerStub;
	let modulesStub;

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

		modulesStub = {
			peers: {
				list: sinonSandbox.stub(),
				getLastConsensus: sinonSandbox.stub(),
			},
			transport: {},
			transactions: {
				transactionInPool: sinonSandbox.stub(),
			},
		};

		broadcaster = new Broadcaster(
			broadcasts,
			force,
			peersStub,
			transactionStub,
			loggerStub
		);

		broadcaster.bind(
			modulesStub.peers,
			modulesStub.transport,
			modulesStub.transaction
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

	describe('enqueue', () => {
		it('should throw error for no params', () => {
			return expect(() => {
				broadcaster.enqueue();
			})
				.to.throw()
				.to.be.instanceOf(Error);
		});

		it('should push params and options to queue', () => {
			const params = {};
			const options = {};
			expect(broadcaster.enqueue(params, options)).to.eql(1);
			return expect(broadcaster.enqueue(params, options)).to.eql(2);
		});
	});

	describe('getPeers', () => {
		beforeEach(() => {
			return modulesStub.peers.list.callsArgWith(1, null, [1]);
		});

		it('should return peers', done => {
			broadcaster.getPeers(params, (err, peers) => {
				expect(err).to.be.null;
				expect(peers).to.be.an('Array').that.is.not.empty;
				done();
			});
		});
	});
});
