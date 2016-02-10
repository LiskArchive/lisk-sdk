var util = require('util'),
	request = require('request'),
	ip = require('ip'),
	fs = require('fs'),
	sandboxHelper = require('../helpers/sandbox.js'),
	async = require('async');

var modules, library, self, private = {}, shared = {};

// Constructor
function Sia(cb, scope) {
	library = scope;
	self = this;
	self.__private = private;

	setImmediate(cb, null, self);
}

Sia.prototype.uploadAscii = function (ascii, cb) {
	request.post({
		url: "http://" + library.config.sia.peer.ip + ":" + library.config.sia.peer.port + "/renter/files/loadascii",
		form: {
			file: ascii
		},
		headers: {
			'User-Agent': 'Sia-Agent'
		},
		json: true
	}, function (err, resp, body) {
		if (err) {
			return cb(err);
		}

		if (typeof body !== 'object') {
			return cb(body);
		}

		if (!body.FilesAdded || body.FilesAdded.length == 0) {
			return cb("Failed to upload ascii");
		}

		return cb(null, body.FilesAdded[0]);
	});
}

Sia.prototype.download = function (file, path, cb) {
	request.post({
		url: "http://" + library.config.sia.peer.ip + ":" + library.config.sia.peer.port + "/renter/files/download",
		form: {
			nickname: file,
			destination: path
		},
		headers: {
			'User-Agent': 'Sia-Agent'
		},
		json: true
	}, function (err, resp, body) {
		if (err) {
			return cb(err);
		}

		return cb();
	});
}

Sia.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
}

// Events
Sia.prototype.onBind = function (scope) {
	modules = scope;
}

// Export
module.exports = Sia;
