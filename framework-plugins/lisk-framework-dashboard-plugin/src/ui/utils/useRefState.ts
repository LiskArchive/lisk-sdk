/*
 * Copyright © 2021 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

import * as React from 'react';

const useRefState = <T = unknown>(a: T): [T, (val: T) => void, React.MutableRefObject<T>] => {
	const [state, _setState] = React.useState(a);
	const stateRef = React.useRef(state);

	const setState = (val: T): void => {
		stateRef.current = val;
		_setState(val);
	};

	return [state, setState, stateRef];
};

export default useRefState;
