# @liskhq/lisk-framework-faucet-plugin

@liskhq/lisk-framework-faucet-plugin is a plugin for distributing testnet tokens from a newly developed blockchain application.

## Installation

```sh
$ npm install --save @liskhq/lisk-framework-faucet-plugin
```

## Config Options

```
{
	encryptedPassphrase: string,
	applicationURL?: string,
  fee?:number,
	tokensToDistribute?: number,
	tokenPrefix?: string,
  logoURL?: string,
  captcha?: object,
}
```

## License

Copyright 2016-2021 Lisk Foundation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

[lisk core github]: https://github.com/LiskHQ/lisk
[lisk documentation site]: https://lisk.com/documentation/lisk-sdk/references/lisk-framework/faucet-plugin.html
