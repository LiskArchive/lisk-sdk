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
			callback();
		}),
		on: jest.fn((event, callback) => {
			callback();
		}),
		removeAllListeners: jest.fn(),
	},
});

module.exports = axon;
