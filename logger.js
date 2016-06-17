var strftime = require("strftime").utc();
var fs = require("fs");
var util = require('util');
require("colors");

module.exports = function (config) {
	config = config || {};
	var exports = {};

	config.levels = config.levels || {
		"trace": 0,
		"debug": 1,
		"log": 2,
		"info": 3,
		"warn": 4,
		"error": 5,
		"fatal": 6
	}

	config.level_abbr = config.level_abbr || {
		"trace" : "trc",
		"debug" : "dbg",
		"log": "log",
		"info": "inf",
		"warn": "WRN",
		"error": "ERR",
		"fatal": "FTL"
	}

	config.filename = config.filename || __dirname + "/logs.log";

	config.errorLevel = config.errorLevel || "log";

	var log_file = fs.createWriteStream(config.filename, { flags: "a" });

	exports.setLevel = function (errorLevel) {
		config.errorLevel = errorLevel;
	}

	function snipsecret(data){
		for (var key in data) {
			if (key.search(/secret/i) > -1){
				data[key] = "XXXXXXXXXX";
			}
		}
		return data;
	};

	Object.keys(config.levels).forEach(function (name) {
		function log(caption, data) {
			var log = {
				"level": name,
				"message": caption,
				"timestamp": strftime("%F %T", new Date())
			}

			data && (log["data"] = snipsecret(data));
			var data_str = log.data ? JSON.stringify(log.data) : "";
			var level_str = config.level_abbr[log.level] ? config.level_abbr[log.level] : "???";

			if (config.levels[config.errorLevel] <= config.levels[log.level]) {
				if (log.data){
					log_file.write(util.format("[%s] %s | %s - %s\n", level_str, log.timestamp, log.message, data_str));
				} else {
					log_file.write(util.format("[%s] %s | %s\n", level_str, log.timestamp, log.message));
				}
			}
			if (config.echo && config.levels[config.echo] <= config.levels[log.level]) {
				try {
					if (log.data){
						console.log("["+level_str.bgYellow.black+"]", log.timestamp.grey, "|", log.message, "-", data_str);
					} else {
						console.log("["+level_str.bgYellow.black+"]", log.timestamp.grey, "|", log.message);
					}
				}catch (e){
					console.log(e)
				}
			}
		}

		exports[name] = log;
	})

	return exports;
}
