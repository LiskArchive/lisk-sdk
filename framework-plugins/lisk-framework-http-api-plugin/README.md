# @liskhq/lisk-framework-http-api-plugin

@liskhq/lisk-framework-http-api-plugin is a plugin for lisk-framework that provides basic HTTP API endpoints to get running node information.

## Installation

```sh
$ npm install --save @liskhq/lisk-framework-http-api-plugin
```

## Config Options

```
{
	port?: number,
	whiteList?: string[],
	cors?: {
		origin: string,
		methods: string,
	},
	limits?: {
		max: number,
		delayMs: number,
		delayAfter: number,
		windowMs: number,
		headersTimeout: number,
		serverSetTimeout: number,
	},
}
```

## License

Copyright 2016-2020 Lisk Foundation

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
[lisk documentation site]: https://lisk.io/documentation/lisk-elements
