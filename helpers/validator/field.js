'use strict';

module.exports = Field;

/**
 *
 * @param {Validator} validator Validator instance
 * @param {string} path Validation field path
 * @param {*} value Validated value
 * @param {object} rules Set of rules
 * @param {*} thisArg Value used as this reference within rule callback calls.
 * @constructor
 */
function Field (validator, path, value, rules, thisArg) {
	this.isAsync = false;
	this.hasError = false;
	this.rules = rules;
	this.value = value;
	this.report = [];
	this.path = path||[];
	this.thisArg = thisArg||null;
	this._stack = Object.keys(rules);
	this.validator = validator;
	this.inProgress = false;
}

/**
 * Create child field.
 * @param {string} path Validation field path
 * @param {*} value Validated value
 * @param {object} rules Set of rules
 * @param {*} thisArg Value used as this reference within rule callback calls.
 * @returns {Validator.Field}
 */
Field.prototype.child = function (path, value, rules, thisArg) {
	var field = this.validator.createField(this.path.concat(path), value, rules, thisArg);
	field.report = this.report;
	return field;
};

/**
 * Validate field value and trigger callback on result
 * @param callback
 */
Field.prototype.validate = function (callback) {
	var stack = this._stack;
	// TODO copy value
	var report = this.report;
	var thisArg = this.thisArg;
	this.inProgress = true;

	if (typeof callback === 'function') {
		this.callback = callback;
		this.hasCallback = true;
	} else {
		this.callback = null;
		this.hasCallback = false;
	}

	var descriptor, result, accept, value;
	while (stack.length) {
		var rule = stack.shift();
		value = this.value;
		accept = this.rules[rule];

		try {
			if (!this.validator.hasRule(rule) && !this.validator.skipMissed) {
				throw new Error('Rule "' + rule + '" not found for "' + this.path.join('.') + '".');
			}

			descriptor = this.validator.getRule(rule);

			if (this.validator.execRules && typeof accept === 'function') {
				accept = accept.call(thisArg, value);
			}

			if (descriptor.accept) {
				accept = descriptor.accept.call(thisArg, accept, value, this);
			}

			if (descriptor.filter) {
				value = this.value = descriptor.filter.call(thisArg, accept, value, this);
			}

			if (descriptor.validate) {
				result = descriptor.validate.call(thisArg, accept, value, this);
			}

			if (this.isAsync) { return; }

			if (result === false) {
				report.push({
					path : this.path,
					rule : rule,
					accept : accept
				});

				this.hasError = true;
				stack.length = 0;
			}
		} catch (err) {
			if (!err.field) {
				Object.defineProperty(err, 'field', {
					enumerable : false,
					value : this
				});
			}
			this.validator.onError(this, err);
			this.end(err, report, value);
			return;
		}
	}

	this.inProgress = false;

	if (!stack.length) {
		this.end(null, report, value);
	}
};

/**
 * End validation. Drop validation stack.
 * @param {Error} err Report and error if passed. Optional
 */
Field.prototype.end = function (err) {
	this._stack = [];

	if (this.hasError) {
		this.validator.onInvalid(this);
	} else {
		this.validator.onValid(this);
	}

	if (this.hasCallback) {
		this.callback(err, this.report, this.value);
		this.callback = null;
	}
};

/**
 * Create validation async. Callback get done function to emit validation end.
 * @param {function(done:function)} callback
 */
Field.prototype.async = function (callback) {
	this.isAsync = true;
	var self = this;
	callback(function (err){
		if (arguments.length > 1) {
			self.value = arguments[1];
		}

		self.isAsync = false;

		if (err) {
			if (!err.hasOwnProperty('field')) {
				Object.defineProperty(err, 'field', {
					enumerable : false,
					value : self
				});
				self.validator.onError(self, err);
			}
			self.end(err);
		} else if (!self.inProgress) {
			self.validate(self.callback);
		}
	});
};

/**
 * Report an invalid validation result
 * @param {{}} report Validation report object
 */
Field.prototype.issue = function (report){
	this.hasError = true;
	report.path = this.path.concat(report.path);
	this.report.push(report);
};
