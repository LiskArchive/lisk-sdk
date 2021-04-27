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
import { Widget, WidgetBody } from '../widget';
import Icon from '../Icon';
import Text from '../Text';
import styles from './InfoPanel.module.scss';

interface Props {
	onClick?: (event: React.MouseEvent | Event) => void;
	title: string;
	mode?: 'dark' | 'light';
}

const InfoPanel: React.FC<Props> = props => (
	<Widget>
		<WidgetBody size={'xs'} mode={props.mode}>
			<div className={styles.infoHeading}>
				<Text type="tr" color="platinum_gray">
					{props.title}
				</Text>
				{props.onClick && (
					<a href="#" onClick={props.onClick}>
						<Icon size={'l'} name={'chevron_right'}>
							chevron_right
						</Icon>
					</a>
				)}
			</div>
			<div>{props.children}</div>
		</WidgetBody>
	</Widget>
);

export default InfoPanel;
