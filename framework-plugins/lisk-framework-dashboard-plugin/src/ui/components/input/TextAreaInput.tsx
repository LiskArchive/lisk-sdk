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
import * as CodeMirror from 'codemirror';
import styles from './Input.module.scss';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/night.css';
import 'codemirror/theme/icecoder.css';
import 'codemirror/mode/javascript/javascript';

interface Props {
	placeholder?: string;
	value?: string;
	onChange?: (val: string) => void;
	size?: 's' | 'm' | 'l';
	json?: boolean;
}

const TextAreaInput: React.FC<Props> = props => {
	const { placeholder } = props;
	const size = props.size ?? 'm';
	const [value, updateValue] = React.useState(props.value);
	const [initialized, updateInitialized] = React.useState(false);

	const handleOnChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
		updateValue(event.target.value);

		if (props.onChange) {
			props.onChange(event.target.value);
		}
	};

	const textAreaEl = React.useRef<HTMLTextAreaElement>(null);
	React.useEffect(() => {
		if (textAreaEl.current && props.json && !initialized) {
			CodeMirror.fromTextArea(textAreaEl.current, {
				mode: { name: 'javascript', json: true, statementIndent: 2 },
				indentWithTabs: true,
				lineWrapping: true,
				matchBrackets: true,
				theme: 'night',
			} as any);
			updateInitialized(true);
		}
	}, [initialized]);

	return (
		<textarea
			value={value}
			ref={textAreaEl}
			placeholder={placeholder}
			className={`${styles.textArea} ${styles[`textArea-${size}`]}`}
			onChange={handleOnChange}
		/>
	);
};

export default TextAreaInput;
