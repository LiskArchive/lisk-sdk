/**
 * Adds a possibility to validate the app parameters for Lisk Framework provided through:
 * 1. Environment variables (env) like "npm start LISK_NETWORK=test"
 * 2. Command line arguments (arg) like "npm start --network test"
 * These keywords extend Ajv Validator and follow the format:
 * @type {{compile, errors, modifying, valid, metaSchema}}
 */

const env = require('./env');
const arg = require('./arg');

module.exports = { env, arg };
