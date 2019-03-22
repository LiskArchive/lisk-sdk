const rewire = require('rewire');

const subToEvents = rewire(
	'../../../../../../src/modules/http_api/init_steps/subscribe_to_events'
);

describe('init_steps/subscribeToEvents', () => {
	let stub;
	let callbackObject;

	beforeEach(async () => {
		callbackObject = { data: 'channel' };
		stub = {
			arg1: {
				channel: {
					subscribe: sinonSandbox.stub().yields(callbackObject),
				},
			},
			arg2: {
				wsServer: {
					sockets: {
						emit: sinonSandbox.stub(),
					},
				},
			},
		};

		subToEvents(stub.arg1, stub.arg2);
	});

	afterEach(async () => {
		sinonSandbox.restore();
	});

	it('should subscribe to "blocks:change" on channel and emit "blocks/change" event on wsServer with proper data', async () => {
		expect(stub.arg1.channel.subscribe.getCall(0).args[0]).to.equal(
			'chain:blocks:change'
		);
		expect(stub.arg2.wsServer.sockets.emit.getCall(0).args[0]).to.equal(
			'blocks/change'
		);
		expect(stub.arg2.wsServer.sockets.emit.getCall(0).args[1]).to.equal(
			callbackObject.data
		);
	});
	it('should subscribe to "signature:change" on channel and emit "signature/change" event on wsServer with proper data', async () => {
		expect(stub.arg1.channel.subscribe.getCall(1).args[0]).to.equal(
			'chain:signature:change'
		);
		expect(stub.arg2.wsServer.sockets.emit.getCall(1).args[0]).to.equal(
			'signature/change'
		);
		expect(stub.arg2.wsServer.sockets.emit.getCall(1).args[1]).to.equal(
			callbackObject.data
		);
	});
	it('should subscribe to "transactions:change" on channel and emit "transactions/change" event on wsServer with proper data', async () => {
		expect(stub.arg1.channel.subscribe.getCall(2).args[0]).to.equal(
			'chain:transactions:change'
		);
		expect(stub.arg2.wsServer.sockets.emit.getCall(2).args[0]).to.equal(
			'transactions/change'
		);
		expect(stub.arg2.wsServer.sockets.emit.getCall(2).args[1]).to.equal(
			callbackObject.data
		);
	});
	it('should subscribe to "rounds:change" on channel and emit "rounds/change" event on wsServer with proper data', async () => {
		expect(stub.arg1.channel.subscribe.getCall(3).args[0]).to.equal(
			'chain:rounds:change'
		);
		expect(stub.arg2.wsServer.sockets.emit.getCall(3).args[0]).to.equal(
			'rounds/change'
		);
		expect(stub.arg2.wsServer.sockets.emit.getCall(3).args[1]).to.equal(
			callbackObject.data
		);
	});
	it('should subscribe to "multisignatures:signature:change" on channel and emit "multisignatures/signature/change" event on wsServer with proper data', async () => {
		expect(stub.arg1.channel.subscribe.getCall(4).args[0]).to.equal(
			'chain:multisignatures:signature:change'
		);
		expect(stub.arg2.wsServer.sockets.emit.getCall(4).args[0]).to.equal(
			'multisignatures/signature/change'
		);
		expect(stub.arg2.wsServer.sockets.emit.getCall(4).args[1]).to.equal(
			callbackObject.data
		);
	});
	it('should subscribe to "delegates:fork" on channel and emit "delegates/fork" event on wsServer with proper data', async () => {
		expect(stub.arg1.channel.subscribe.getCall(5).args[0]).to.equal(
			'chain:delegates:fork'
		);
		expect(stub.arg2.wsServer.sockets.emit.getCall(5).args[0]).to.equal(
			'delegates/fork'
		);
		expect(stub.arg2.wsServer.sockets.emit.getCall(5).args[1]).to.equal(
			callbackObject.data
		);
	});
	it('should subscribe to "loader:sync" on channel and emit "loader/sync" event on wsServer with proper data', async () => {
		expect(stub.arg1.channel.subscribe.getCall(6).args[0]).to.equal(
			'chain:loader:sync'
		);
		expect(stub.arg2.wsServer.sockets.emit.getCall(6).args[0]).to.equal(
			'loader/sync'
		);
		expect(stub.arg2.wsServer.sockets.emit.getCall(6).args[1]).to.equal(
			callbackObject.data
		);
	});
});
