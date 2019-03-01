const { promisify } = require('util');
const httpApi = require('../helpers/http_api');

const promisifiedBootstrapSwagger = promisify(httpApi.bootstrapSwagger);

module.exports = (scope, expressApp) =>
	promisifiedBootstrapSwagger(
		expressApp,
		scope.config,
		scope.components.logger,
		scope
	);
