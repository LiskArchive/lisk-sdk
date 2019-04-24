const pm2Axon = jest.genMockFromModule('pm2-axon');

pm2Axon.socket = jest.fn().mockReturnValue({
	connect: jest.fn(),
	close: jest.fn(),
	on: jest.fn(),
	once: jest.fn((event, callback) => {
		callback();
	}),
	bind: jest.fn(),
	emit: jest.fn(),
	removeAllListeners: jest.fn(),
	sock: {
		once: jest.fn((event, callback) => {
			callback('#MOCKED_ONCE');
		}),
		on: jest.fn((event, callback) => {
			callback('#MOCKED_ON');
		}),
		removeAllListeners: jest.fn(),
	},
});

module.exports = pm2Axon;
