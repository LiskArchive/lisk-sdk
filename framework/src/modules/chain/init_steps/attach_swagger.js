const util = require('util');
const httpApi = require('../helpers/http_api.js');

const promisifiedBootstrapSwagger = util.promisify(httpApi.bootstrapSwagger);

module.exports = async ({ config, logger, network, scope }) =>
	promisifiedBootstrapSwagger(network.app, config, logger, scope);
