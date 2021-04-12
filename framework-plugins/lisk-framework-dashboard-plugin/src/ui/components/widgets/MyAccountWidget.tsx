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
import { Widget, WidgetBody, WidgetHeader } from '../widget';
import { TableBody, TableHeader, Table } from '../Table';
import CopiableText from '../CopiableText';
import Text from '../Text';

interface AccountInfo {
	readonly binaryAddress?: string;
	readonly publicKey?: string;
}

interface MyAccountProps {
	accounts: ReadonlyArray<AccountInfo>;
	onSelect?: () => void;
}

const MyAccountWidget: React.FC<MyAccountProps> = props => {
	const { accounts, onSelect } = props;

	return (
		<Widget>
			<WidgetHeader>
				<Text type={'h2'}>My Accounts</Text>
			</WidgetHeader>
			<WidgetBody>
				<Table>
					<TableHeader sticky>
						<tr>
							<th style={{ width: 'calc(60% - 110px)' }}>
								<Text>Binary addresss</Text>
							</th>
							<th style={{ width: 'calc(40% - 110px)' }}>
								<Text>Public Key</Text>
							</th>
						</tr>
					</TableHeader>
					<TableBody>
						{accounts?.length ? (
							accounts.map((account: AccountInfo, index) => (
								<tr key={index}>
									<td onClick={onSelect}>
										<CopiableText text={account.binaryAddress as string}>
											{account.binaryAddress}
										</CopiableText>
									</td>
									<td onClick={onSelect}>
										<CopiableText text={account.publicKey as string}>
											{account.publicKey}
										</CopiableText>
									</td>
								</tr>
							))
						) : (
							<Text>You don't have any accounts</Text>
						)}
					</TableBody>
				</Table>
			</WidgetBody>
		</Widget>
	);
};

export default MyAccountWidget;
