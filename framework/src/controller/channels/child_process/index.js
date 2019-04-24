const setupProcessHandlers = channel => {
	process.once('SIGTERM', () => channel.cleanup(1));
	process.once('SIGINT', () => channel.cleanup(1));
	process.once('cleanup', (error, code) => channel.cleanup(code, error));
	process.once('exit', (error, code) => channel.cleanup(code, error));
};

module.exports = {
	setupProcessHandlers,
};
