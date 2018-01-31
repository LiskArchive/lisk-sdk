sql files
---------

This folder contains all SQL files used in the project:

* A folder for each database repository, containing SQL files used by that repository.
* File [./config.js](./config.js) provides the tools for loading external SQL files.
* File [./index.js](./index.js) individually references and loads each SQL file in the project.

## standards

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
* Camel-case column names are wrapped in double quotes, while low-case ones are not
* Avoid as much as possible use of [Index Variables], and use [Named Parameters] instead, with `${name}` syntax

## adding files

When adding a new SQL file, it must be correctly referenced within [./index.js](./index.js)

In case of any issue with the SQL file or its reference, the application is configured to throw an error
into the console and exit the process immediately.

## development notes

When editing an SQL file on the development machine, you do not need to restart the application in order
to see the immediate change. The development environment is configured to detect any change, and reload
the SQL file immediately. This feature is provided automatically by the [QueryFile] class (option `debug`).

[Index Variables]:https://github.com/vitaly-t/pg-promise#index-variables
[Named Parameters]:https://github.com/vitaly-t/pg-promise#named-parameters
[QueryFile]:http://vitaly-t.github.io/pg-promise/QueryFile.html

