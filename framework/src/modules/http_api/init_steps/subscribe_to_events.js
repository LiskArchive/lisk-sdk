module.exports = ({ channel }, wsServer) => {
	channel.subscribe('chain:blocks:change', event => {
		wsServer.emit('blocks/change', event.data);
	});
	channel.subscribe('chain:signature:change', event => {
		wsServer.emit('signature/change', event.data);
	});
	channel.subscribe('chain:transactions:change', event => {
		wsServer.emit('transactions/change', event.data);
	});
	channel.subscribe('chain:rounds:change', event => {
		wsServer.emit('rounds/change', event.data);
	});
	channel.subscribe('chain:multisignatures:signature:change', event => {
		wsServer.emit('multisignatures/signature/change', event.data);
	});
	channel.subscribe('chain:delegates:fork', event => {
		wsServer.emit('delegates/fork', event.data);
	});
	channel.subscribe('chain:loader:sync', event => {
		wsServer.emit('loader/sync', event.data);
	});
};
