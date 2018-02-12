## SQL Files

This folder contains all SQL files used in the project:

* A folder for each database repository, containing SQL files used by that repository.
* File [./config.js](./config.js) provides the tools for loading external SQL files.
* File [./index.js](./index.js) individually references and loads each SQL file in the project.

## Standards

Each SQL file follows the following guidelines at the moment:

* The file name uses the underscore convention
* The file must contain the generic Copyright &copy; note at the top, followed by the documentation header:

```
/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/
```

The details must be provided when creating a new SQL file.

* SQL uses capital case only for reserved words and SQL constants, while function names use low case
* Camel-case column names are wrapped in double quotes, while low-case ones are not, except when the name
  uses a reserved SQL word or type, like `"timestamp""`, for example
* Avoid as much as possible use of [Index Variables], and use [Named Parameters] instead, with `${name}` syntax.
* Comments in the file can use both `/* multiline */` and `-- single-line` syntax.

## Adding Files

When adding a new SQL file, it must be correctly referenced within [./index.js](./index.js)

In case of any issue with the SQL file or its reference, the application is configured to throw an error
into the console and exit the process immediately.

Please note that while each external SQL file must use underscore notation in its name, each reference
to the file must use the corresponding camel case within [./index.js](./index.js).

Try to avoid needlessly repeating in the file name the name of the repository that uses the file.

## Development Notes

When editing an SQL file on the development machine, you do not need to restart the application in order
to see the immediate change. Class [QueryFile] automatically detects changes and reloads the SQL file
immediately, if its option `debug` is set.

Option `debug` defaults to `true` when your `NODE_ENV` is set to a name that contains `dev` in it,
case-insensitive. Otherwise, SQL-auto-reload feature is disabled.

[index variables]: https://github.com/vitaly-t/pg-promise#index-variables
[named parameters]: https://github.com/vitaly-t/pg-promise#named-parameters
[queryfile]: http://vitaly-t.github.io/pg-promise/QueryFile.html
