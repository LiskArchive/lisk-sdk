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
import Text, { Props as TextProps } from '../Text';

export interface TickerProps extends TextProps {
	seconds: number;
}

const Ticker: React.FC<TickerProps> = props => {
	const [seconds, setSeconds] = React.useState(props.seconds);

	React.useEffect(() => {
		if (seconds > 0) {
			setTimeout(() => setSeconds(seconds - 1), 1000);
		} else {
			clearInterval(seconds);
		}
	});

	return <Text {...props}>{seconds}</Text>;
};

export default Ticker;
