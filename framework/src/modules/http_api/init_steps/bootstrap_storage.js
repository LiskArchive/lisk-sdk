module.exports = async ({ components: { storage, logger } }, accountLimit) =>
	storage
		.bootstrap()
		.then(async status => {
			if (!status) {
				throw new Error('Can not bootstrap the storage component');
			}
			storage.entities.Account.extendDefaultOptions({
				limit: accountLimit,
			});
		})
		.catch(err => {
			logger.error(err);
			throw err;
		});
