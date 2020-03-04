export const sortKeysAscending = (publicKeys: string[]): string[] =>
	publicKeys.sort((publicKeyA, publicKeyB) => {
		if (publicKeyA > publicKeyB) {
			return 1;
		}
		if (publicKeyA < publicKeyB) {
			return -1;
		}

		return 0;
	});
