const BaseChannel = require('./base_channel.js');
const InMemoryChannel = require('./in_memory_channel.js');
const ChildProcessChannel = require('./child_process_channel.js');

/**
 * @namespace framework.controller.channels
 * @see Parent: {@link controller}
 */
module.exports = {
	BaseChannel,
	InMemoryChannel,
	ChildProcessChannel,
};
