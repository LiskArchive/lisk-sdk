module.exports = function (zscheme) {
	return function(req, res, next) {
		req.sanitize = sanitize;

		function sanitize(value, scheme, callback) {
			return zscheme.validate(value, scheme, function (err, valid) {
				return callback(null, {
					isValid: valid,
					issues: err? err[0].message + ": " + err[0].path : null
				}, value);
			});
		}

		next();
	};
}
