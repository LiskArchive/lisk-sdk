const axon = jest.genMockFromModule('axon');

axon.socket = jest.fn().mockReturnValue({
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

module.exports = axon;
