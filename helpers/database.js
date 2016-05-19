var async = require('async');
var path = require('path');

// var isWin = /^win/.test(process.platform);
// var isMac = /^darwin/.test(process.platform);

module.exports.connect = function (config, logger, cb) {
	var pgOptions = {
		pgNative: true
	};

	var pgp = require('pg-promise')(pgOptions);
	var monitor = require('pg-monitor');

	monitor.attach(pgOptions, config.logEvents);
	monitor.setTheme('matrix');

	monitor.log = function(msg, info){
		logger.log(info.event, info.text);
		info.display = false;
	};

	config.user = config.user || process.env['USER'];

	var db = pgp(config);

	var files = ['schema.sql', 'views.sql'];

	async.eachSeries(files, function (file, cb) {
		var sql = new pgp.QueryFile(path.join('sql', file), { minify: true });

		db.query(sql).then(function (data) {
			cb(null, data);
		}).catch(function (err) {
			cb(err);
		});
	}, function (err) {
		return cb(err, db);
	});
}
