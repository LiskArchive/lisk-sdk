declare module 'varuint-bitcoin' {
	export function encode(num: number, buffer?: Buffer, offset?: number): Buffer;
}
