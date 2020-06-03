export const searchBufferArray = (
	search: Buffer,
	collection: Buffer[],
): boolean => {
	for (const buffer of collection) {
		if (buffer.compare(search) === 0) {
			return true;
		}
	}
	return false;
};
