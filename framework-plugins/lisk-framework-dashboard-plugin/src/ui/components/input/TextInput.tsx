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
import styles from './Input.module.scss';

interface Props {
	placeholder?: string;
	value?: string;
	onChange?: (val: string) => void;
}

const TextInput: React.FC<Props> = props => {
	const { placeholder } = props;
	const [value, updateValue] = React.useState(props.value ?? '');

	const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		updateValue(event.target.value);

		if (props.onChange) {
			props.onChange(event.target.value);
		}
	};

	return (
		<input
			value={value}
			placeholder={placeholder}
			className={styles.text}
			onChange={handleOnChange}
		/>
	);
};

export default TextInput;
