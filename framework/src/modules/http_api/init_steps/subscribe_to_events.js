module.exports = ({ channel }, wsServer) => {
	channel.subscribe('blocks:change', event => {
		wsServer.emit('blocks/change', event.data);
	});
	channel.subscribe('signature:change', event => {
		wsServer.emit('signature/change', event.data);
	});
	channel.subscribe('transactions:change', event => {
		wsServer.emit('transactions/change', event.data);
	});
	channel.subscribe('rounds:change', event => {
		wsServer.emit('rounds/change', event.data);
	});
	channel.subscribe('multisignatures:signature:change', event => {
		wsServer.emit('multisignatures/signature/change', event.data);
	});
	channel.subscribe('delegates:fork', event => {
		wsServer.emit('delegates/fork', event.data);
	});
	channel.subscribe('loader:sync', event => {
		wsServer.emit('loader/sync', event.data);
	});
};
