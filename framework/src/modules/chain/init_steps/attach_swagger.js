const util = require('util');
const httpApi = require('../helpers/http_api.js');

const promisifiedBootstrapSwagger = util.promisify(httpApi.bootstrapSwagger);

module.exports = async scope =>
	promisifiedBootstrapSwagger(scope.config, scope.components.logger, scope);
