var z_schema = require('../../helpers/z_schema');
var helpers = require('sway/lib/helpers');

module.exports = function create (fittingDef, bagpipes) {

	// Get validator instace attached to Swagger
	var validator = helpers.getJSONSchemaValidator();

	// Register lisk formats with swagger
	Object.keys(z_schema.formatsCache).forEach(function (formatName) {
		// Extend swagger validator with our formats
		validator.constructor.registerFormat(formatName, z_schema.formatsCache[formatName]);
	});

	return function custom_params_formats (context, cb) {
		cb();
	};
};
