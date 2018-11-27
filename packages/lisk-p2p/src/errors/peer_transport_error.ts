export class PeerTransportError extends Error {
	public peerId: string;

	public constructor(message: string, peerId: string) {
		super(message);
		this.name = 'PeerTransportError';
		this.peerId = peerId;
	}
}
