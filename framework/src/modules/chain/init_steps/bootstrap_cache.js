module.exports = async ({ components: { cache, logger } }) => {
	if (!cache.options.enabled) {
		logger.debug('Cache not enabled');
		return Promise.resolve();
	}
	return cache.bootstrap();
};
