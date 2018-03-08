/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

'use strict';

var utils = require('../validator/utils');
var Validator = require('../validator');
var Field = require('./field');

module.exports = JsonSchema;

/**
 * Description of the class.
 *
 * @class
 * @memberof helpers.json-schema
 * @requires helpers/json-schema/field
 * @requires helpers/validator
 * @see Parent: {@link helpers.json-schema}
 * @todo Add description for the class
 * @todo Add @param tags
 */
function JsonSchema(options) {
	Validator.call(this, options);
}

utils.inherits(JsonSchema, Validator);
JsonSchema.Field = Field;
JsonSchema.prototype.Field = Field;
JsonSchema.rules = {};
JsonSchema.prototype.rules = {};

JsonSchema.addRule = Validator.addRule;
JsonSchema.fieldProperty = Validator.fieldProperty;

// Add fast call
JsonSchema.options = utils.extend({}, Validator.options);
JsonSchema.validate = Validator.validate;

JsonSchema.addRule('type', {
	/**
	 * Description of the function.
	 *
	 * @func type_validate
	 * @memberof helpers.json-schema.JsonSchema
	 * @param {string} accept
	 * @param {Object} value
	 * @todo Add @returns tag
	 * @todo Add description for the function and the params
	 */
	validate(accept, value) {
		switch (accept) {
			case 'array':
				return Array.isArray(value);
			case 'object':
				return typeof value === 'object' && value !== null;
			case 'null':
				return value === null;
			case 'integer':
				return typeof value === 'number';
			default:
				return typeof (value === accept);
		}
	},
});

JsonSchema.addRule('default', {
	/**
	 * Description of the function.
	 *
	 * @func default_filter
	 * @memberof helpers.json-schema.JsonSchema
	 * @param {string} accept
	 * @param {Object} value
	 * @todo Add @returns tag
	 * @todo Add description for the function and the params
	 */
	filter(accept, value) {
		if (typeof value === 'undefined') {
			return accept;
		}
		return value;
	},
});

JsonSchema.addRule('enum', {
	/**
	 * Description of the function.
	 *
	 * @func enum_validate
	 * @memberof helpers.json-schema.JsonSchema
	 * @param {string} accept
	 * @param {Object} value
	 * @todo Add @returns tag
	 * @todo Add description for the function and the params
	 */
	validate(accept, value) {
		return accept.indexOf(value) > -1;
	},
});

// String rules

JsonSchema.addRule('case', {
	/**
	 * Description of the function.
	 *
	 * @func case_validate
	 * @memberof helpers.json-schema.JsonSchema
	 * @param {string} accept
	 * @param {Object} value
	 * @todo Add @returns tag
	 * @todo Add description for the function and the params
	 */
	validate(accept, value) {
		if (accept === 'lower') {
			return String(value).toLowerCase() === String(value);
		} else if (accept === 'upper') {
			return String(value).toUpperCase() === String(value);
		}
		return true;
	},
});

JsonSchema.addRule('minLength', {
	/**
	 * Description of the function.
	 *
	 * @func minLength_validate
	 * @memberof helpers.json-schema.JsonSchema
	 * @param {string} accept
	 * @param {Object} value
	 * @todo Add @returns tag
	 * @todo Add description for the function and the params
	 */
	validate(accept, value) {
		return String(value).length >= accept;
	},
});

JsonSchema.addRule('maxLength', {
	/**
	 * Description of the function.
	 *
	 * @func maxLength_validate
	 * @memberof helpers.json-schema.JsonSchema
	 * @param {string} accept
	 * @param {Object} value
	 * @todo Add @returns tag
	 * @todo Add description for the function and the params
	 */
	validate(accept, value) {
		return String(value).length <= accept;
	},
});

JsonSchema.addRule('pattern', {
	/**
	 * Description of the function.
	 *
	 * @func pattern_validate
	 * @memberof helpers.json-schema.JsonSchema
	 * @param {string} accept
	 * @param {Object} value
	 * @todo Add @returns tag
	 * @todo Add description for the function and the params
	 */
	validate(accept, value) {
		if (accept instanceof RegExp === false) {
			accept = new RegExp(accept);
		}
		return accept.test(value);
	},
});

// Numeric rules

JsonSchema.addRule('minimum', {
	/**
	 * Description of the function.
	 *
	 * @func minimum_validate
	 * @memberof helpers.json-schema.JsonSchema
	 * @param {number} accept
	 * @param {number} value
	 * @param {Object} field
	 * @todo Add @returns tag
	 * @todo Add description for the function and the params
	 */
	validate(accept, value, field) {
		if (field.rules.exclusiveMinimum) {
			return value > accept;
		}
		return value >= accept;
	},
});

JsonSchema.addRule('exclusiveMinimum', {});

JsonSchema.addRule('maximum', {
	/**
	 * Description of the function.
	 *
	 * @func maximum_validate
	 * @memberof helpers.json-schema.JsonSchema
	 * @param {number} accept
	 * @param {number} value
	 * @param {Object} field
	 * @todo Add @returns tag
	 * @todo Add description for the function and the params
	 */
	validate(accept, value, field) {
		if (field.rules.exclusiveMaximum) {
			return value < accept;
		}
		return value <= accept;
	},
});

JsonSchema.addRule('exclusiveMaximum', {});

JsonSchema.addRule('divisibleBy', {
	/**
	 * Description of the function.
	 *
	 * @func divisibleBy_validate
	 * @memberof helpers.json-schema.JsonSchema
	 * @param {number} accept
	 * @param {number} value
	 * @todo Add @returns tag
	 * @todo Add description for the function and the params
	 */
	validate(accept, value) {
		return value % accept === 0;
	},
});

// Object rules

JsonSchema.addRule('properties', {
	/**
	 * Description of the function.
	 *
	 * @func properties_validate
	 * @memberof helpers.json-schema.JsonSchema
	 * @param {number} accept
	 * @param {number} value
	 * @todo Add @returns tag
	 * @todo Add description for the function and the params
	 */
	validate(accept, value, field) {
		if (!field.isObject()) {
			return;
		}

		field.async(done => {
			var result = {};
			var properties = Object.getOwnPropertyNames(accept);

			Object.keys(value).forEach(property => {
				if (properties.indexOf(property) < 0) {
					properties.push(property);
				}
			});

			var l = properties.length;

			var additionalProperty = field.rules.additionalProperties || false;

			function end(err) {
				if (l === null) {
					return;
				}

				--l;

				if (err) {
					l = null;
				}

				if (!l) {
					done(err);
				}
			}

			properties.forEach(property => {
				var acceptProperty;

				if (!accept.hasOwnProperty(property)) {
					if (additionalProperty === true) {
						result[property] = value[property];
						return end(); // Accept anyway
					} else if (additionalProperty) {
						acceptProperty = additionalProperty; // Check custom property to match additionalProperties
					} else {
						return end();
					}
				} else if (!value.hasOwnProperty(property)) {
					acceptProperty = accept[property];
					if (acceptProperty.hasOwnProperty('default')) {
						result[property] = acceptProperty.default;
					}
					return end();
				} else {
					acceptProperty = accept[property];
				}

				var child = field.child(
					property,
					value[property],
					acceptProperty,
					value
				);
				child.validate((err, report, value) => {
					result[property] = value;

					end(err);
				});
			});
		});
	},
});

JsonSchema.addRule('additionalProperties', {});

JsonSchema.addRule('minProperties', {
	/**
	 * Description of the function.
	 *
	 * @func minProperties_validate
	 * @memberof helpers.json-schema.JsonSchema
	 * @todo Add @returns tag and @param tags
	 * @todo Add description for the function and the params
	 */
	validate(accept, value) {
		return Object.keys(value).length >= accept;
	},
});

JsonSchema.addRule('maxProperties', {
	/**
	 * Description of the function.
	 *
	 * @func maxProperties_validate
	 * @memberof helpers.json-schema.JsonSchema
	 * @todo Add @returns tag and @param tags
	 * @todo Add description for the function and the params
	 */
	validate(accept, value) {
		return Object.keys(value).length <= accept;
	},
});

JsonSchema.addRule('required', {
	/**
	 * Description of the function.
	 *
	 * @func required_validate
	 * @memberof helpers.json-schema.JsonSchema
	 * @todo Add @returns tag and @param tags
	 * @todo Add description for the function and the params
	 */
	validate(accept, value, field) {
		accept.forEach(property => {
			if (value.hasOwnProperty(property)) {
				return;
			}

			field.issue({
				path: property,
				rule: 'required',
			});
		});
	},
});

// Array rules

// TODO Add items as Array value
// TODO Add additionalItems

JsonSchema.addRule('items', {
	/**
	 * Description of the function.
	 *
	 * @func items_validate
	 * @memberof helpers.json-schema.JsonSchema
	 * @todo Add @returns tag and @param tags
	 * @todo Add description for the function and the params
	 */
	validate(accept, value, field) {
		if (!Array.isArray(value)) {
			return;
		}

		field.async(done => {
			var result = [];
			var l = value.length;

			function end(err) {
				if (l === null) {
					return;
				}

				--l;

				if (err) {
					l = null;
				}

				if (!l) {
					done(err);
				}
			}

			value.forEach((item, i) => {
				var child = field.child(i, item, accept, value);
				child.validate((err, report, value) => {
					if (err) {
						return end(err);
					}

					result[i] = value;

					end();
				});
			});
		});
	},
});

JsonSchema.addRule('minItems', {
	/**
	 * Description of the function.
	 *
	 * @func minItems_validate
	 * @memberof helpers.json-schema.JsonSchema
	 * @todo Add @returns tag and @param tags
	 * @todo Add description for the function and the params
	 */
	validate(accept, value) {
		return Array.isArray(value) && value.length >= accept;
	},
});

JsonSchema.addRule('maxItems', {
	/**
	 * Description of the function.
	 *
	 * @func maxItems_validate
	 * @memberof helpers.json-schema.JsonSchema
	 * @todo Add @returns tag and @param tags
	 * @todo Add description for the function and the params
	 */
	validate(accept, value) {
		return Array.isArray(value) && value.length <= accept;
	},
});

JsonSchema.addRule('uniqueItems', {
	/**
	 * Description of the function.
	 *
	 * @func uniqueItems_validate
	 * @memberof helpers.json-schema.JsonSchema
	 * @todo Add @returns tag and @param tags
	 * @todo Add description for the function and the params
	 */
	validate(accept, value, field) {
		if (!accept) {
			return;
		}
		if (!Array.isArray(value)) {
			return;
		}

		var i = -1;
		var l = value.length;
		var unique = [];
		var item;

		while (++i < l) {
			item = value[i];

			if (unique.indexOf(item) > -1) {
				field.issue({
					path: i,
					rule: 'uniqueItems',
					accept: true,
				});
			} else {
				unique.push(item);
			}
		}

		return Array.isArray(value) && value.length >= accept;
	},
});
