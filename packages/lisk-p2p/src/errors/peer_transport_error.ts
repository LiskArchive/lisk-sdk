import { P2PError } from './p2p_error';

export class PeerTransportError extends P2PError {
	private readonly _peerId: string;

	public constructor(message: string, peerId: string) {
		super(message, 'PeerTransportError');
		this._peerId = peerId;
	}

	public get peerId(): string {
		return this._peerId;
	}
}
