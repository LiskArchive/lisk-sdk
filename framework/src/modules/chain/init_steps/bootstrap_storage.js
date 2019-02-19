module.exports = async ({ components: { storage, logger } }, accountLimit) => {
	try {
		const status = await storage.bootstrap();
		if (!status) {
			throw new Error('Can not bootstrap the storage component');
		}
		storage.entities.Account.extendDefaultOptions({
			limit: accountLimit,
		});
		await storage.entities.Migration.applyAll();
		await storage.entities.Migration.applyRunTime();
	} catch (err) {
		logger.error(err);
		throw err;
	}
};
