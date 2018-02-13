# Contributing to lisk-template

First off, thanks for taking the time to contribute! :raised_hands:

The following is a set of guidelines for contributing to lisk-template, which
are hosted in the [LiskHQ Organization](https://github.com/LiskHQ) on GitHub.
These are mostly guidelines, not rules. Use your best judgment, and feel free to
propose changes to this document in a pull request.

#### Table Of Contents

1. [Code of Conduct](#code-of-conduct)

1. [Help! I don’t want to read this whole thing, I just have one question. :mag_right:](#help!-i-dont-want-to-read-this-whole-thing-i-just-have-a-question)

1. [How Can I Contribute?](#how-can-i-contribute)

	1. [Reporting Bugs](#reporting-bugs)
	1. [Suggesting Enhancements](#suggesting-enhancements)
	1. [Pull Requests](#pull-requests)

1. [Styleguides](#styleguides)
	1. [Git Commit Messages](#git-commit-messages)
	1. [JavaScript Styleguide](#javascript-styleguide)

## Code of Conduct

This project and everyone participating in it is governed by the
[lisk-template Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are
expected to uphold this code. Please report unacceptable behavior to
[info@lisk.io](mailto:info@lisk.io).

## Project License

Every repository within LiskHQ comes with a LICENSE file. Please read it
carefully before commiting your code to one of the repositories.

## Help! I don’t want to read this whole thing, I just have a question. :mag_right:

Lisk is an open-source decentralized project, there are many ways and platforms
to get help. These are some of them:

* [Discuss and Ask on Reddit](https://www.reddit.com/r/Lisk/)
* [Lisk FAQ](https://docs.lisk.io/docs/faq)

If you prefer to chat with LiskHQ and other developers directly:

* [Join the LiskHQ Gitter](https://gitter.im/LiskHQ/lisk)
* Even though Gitter is a chat service, sometimes it takes several hours for
	community members to respond &mdash; please be patient!

## How Can I Contribute?

LiskHQ uses GitHub as its sole source of truth. Everything happens here.
Lightcurve employees who contribute to Lisk are expected to do so in the same
way as everyone else. In other words, this document applies equally to all
contributors.

### `master` is unsafe for production use

We will do our best to keep `master` in good shape, with tests passing at all
times. But in order to move fast, we will make API changes that your application
might not be compatible with. We will do our best to communicate these changes
and always version appropriately so you can lock into a specific, stable
version.

### Pull Requests

In case you’ve never submitted a pull request (PR) via GitHub before, please
read
[this short tutorial](https://help.github.com/articles/creating-a-pull-request).
If you’ve submitted a PR before, there should be nothing surprising about our
procedures for Lisk.

_Before_ submitting a pull request, please make sure the following is done:

1. Fork the repo.
1. If you are creating a pull request that addresses a specific issue, take a
	look at the projects that issue is a part of (in the right-hand sidebar).
	Most issues will be a part of a project for a specific version, such as
	"Version 0.3.0". If this is the case, create your branch from the relevant
	version branch, e.g. `0.3.0`, and submit your pull request against that
	branch as a base. Otherwise, create your branch from `master`.
1. Add tests to the code you have contributed! All new code must come with
	complete test coverage.
1. End all files with a newline. In general, your code should conform to the
	rules listed in the `.editorconfig` file. There are plugins for most
	editors/IDEs to do this for you automatically. Update the README for the
	changes that adhere to your new code.
1. Format your code using [Prettier](https://prettier.io/). This should be done
	for you automatically when you commit files, but can be performed manually
	with `npm run format`.
1. Ensure the test and linting suite passes (`npm run prepush` runs both).
	Follow the [JavaScript](https://github.com/airbnb/javascript) styleguide from
	Airbnb with the
	[lisk extension](https://github.com/LiskHQ/eslint-config-lisk-base).
1. Submit a pull request via GitHub. Include issue numbers in the PR title, at
	the end with: `Description - Closes #IssueNumber`.
1. Check that Jenkins CI tests pass (pull request turns green). First time
	contributors will need to wait for a trusted team member to start Jenkins CI
	on a Pull Request.

### Reporting Bugs

This section guides you through submitting a bug report for lisk-template.
Following these guidelines helps maintainers and the community understand your
report :pencil:, reproduce the behavior :computer: :computer:, and find related
reports :mag_right:.

Before creating bug reports, please check
[this list](#before-submitting-a-bug-report) as you might find out that you
don’t need to create one. When you are creating a bug report, please
[include as many details as possible](#how-do-i-submit-a-good-bug-report). Fill
out [the required template](ISSUE_TEMPLATE.md), the information it asks for
helps us resolve issues faster.

> **Note:** If you find a **Closed** issue that seems like it is the same thing

    that you’re experiencing, open a new issue and include a link to the original
	issue in the body of your new one.

#### Before Submitting A Bug Report

* **Check the [FAQs](https://docs.lisk.io/docs/faq)** for a list of common
	questions and problems.
* **Determine
	[which repository the problem should be reported in](https://github.com/LiskHQ)**.
* **Perform a
	[cursory search](https://github.com/search?utf8=%E2%9C%93&q=+is%3Aissue+org%3ALiskHQ&type=)**
	to see if the problem has already been reported. If it has **and the issue is
	still open**, add a comment to the existing issue instead of opening a new
	one.

#### How Do I Submit A (Good) Bug Report?

Bugs are tracked as [GitHub issues](https://guides.github.com/features/issues/).
After you’ve determined [which repository](https://github.com/LiskHQ) your bug
is related to, create an issue on that repository and provide the following
information by filling in [the template](ISSUE_TEMPLATE.md).

Explain the problem and include additional details to help maintainers reproduce
the problem:

* **Use a clear and descriptive title** for the issue to identify the problem.
* **Describe the exact steps which reproduce the problem** in as many details as
	possible. When listing steps, **don’t just say what you did, but explain how
	you did it**. **Make sure to erase sensitive information from the
	configuration or details you are passing - NEVER SHARE YOUR SECRET PASSPHRASES
	OR PRIVATE KEYS**.
* **Provide specific examples to demonstrate the steps**. Include links to files
	or GitHub projects, or copy/pasteable snippets, which you use in those
	examples. If you’re providing snippets in the issue, use
	[Markdown code blocks](https://help.github.com/articles/markdown-basics/#multiple-lines).
* **Describe the behavior you observed after following the steps** and point out
	what exactly is the problem with that behavior.
* **Explain which behavior you expected to see instead and why.**
* **Include screenshots and animated GIFs** which show you following the
	described steps and clearly demonstrate the problem. You can use
	[this tool](http://www.cockos.com/licecap/) to record GIFs on macOS and
	Windows, and [this tool](https://github.com/colinkeenan/silentcast) or
	[this tool](https://github.com/GNOME/byzanz) on Linux.
* **If the problem wasn’t triggered by a specific action**, describe what you
	were doing before the problem happened and share more information using the
	guidelines below.

Provide more context by answering these questions:

* **Did the problem start happening recently** (e.g. after updating to a new
	version of lisk-template, Lisk or any other repository) or was this always a
	problem?
* If the problem started happening recently, **can you reproduce the problem in
	an older version of lisk-template?** What’s the most recent version in which
	the problem doesn’t happen? You can download older versions of lisk-template
	from [the releases page](https://github.com/LiskHQ/lisk-template/releases).
* **Can you reliably reproduce the issue?** If not, provide details about how
	often the problem happens and under which conditions it normally happens.

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion for
lisk-template, including completely new features and minor improvements to
existing functionality. Following these guidelines helps maintainers and the
community understand your suggestion :pencil: and find related suggestions
:mag_right:.

When you are creating an enhancement suggestion, please include as many details
as possible. Fill in [the template](ISSUE_TEMPLATE.md), including the steps that
you imagine you would take if the feature you’re requesting existed.

#### How Do I Submit A (Good) Enhancement Suggestion?

Enhancement suggestions are tracked as
[GitHub issues](https://guides.github.com/features/issues/). After you’ve
determined [which repository](https://github.com/LiskHQ) your enhancement
suggestion is related to, create an issue on that repository and provide the
following information:

* **Use a clear and descriptive title** for the issue to identify the
	suggestion.
* **Provide a step-by-step description of the suggested enhancement** in as many
	details as possible.
* **Provide specific examples to demonstrate the steps**. Include copy/pasteable
	snippets which you use in those examples, as
	[Markdown code blocks](https://help.github.com/articles/markdown-basics/#multiple-lines).
* **Describe the current behavior** and **explain which behavior you expected to
	see instead** and why.
* **Include screenshots and animated GIFs** which help you demonstrate the steps
	or point out the part of lisk-template which the suggestion is related to. You
	can use [this tool](http://www.cockos.com/licecap/) to record GIFs on macOS
	and Windows, and [this tool](https://github.com/colinkeenan/silentcast) or
	[this tool](https://github.com/GNOME/byzanz) on Linux.
* **Explain why this enhancement would be useful** to most Lisk and
	lisk-template users.
* **Specify which version of Lisk and lisk-template you’re using.**
* **Specify the name and version of the OS you’re using.**

## Styleguides

### Git Commit Messages

* Use the present tense ("Add feature" not "Added feature")
* Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
* Limit the first line to 72 characters or less
* Reference issues and pull requests liberally after the first line
* Consider starting the commit message with an applicable emoji:
	* :seedling: `:seedling:` when adding a new feature
	* :bug: `:bug:` when fixing a bug
	* :books: `:books:` when adding or updating documentation
	* :nail_care: `:nail_care:` when making changes to code style (e.g. lint settings)
	* :recycle: `:recycle:` when refactoring code
	* :fire: `:fire:` when removing code or files (including dependencies)
	* :racehorse: `:racehorse:` when improving performance
	* :white_check_mark: `:white_check_mark:` when adding or updating tests
	* :construction_worker: `:construction_worker:` when updating the build process
	* :bowtie: `:bowtie:` when updating CI
	* :house: `:house:` when performing chores
	* :new: `:new:` when adding a new dependency
	* :arrow_up: `:arrow_up:` when upgrading a dependency
	* :arrow_down: `:arrow_down:` when downgrading a dependency
	* :back: `:back:` when reverting changes

### JavaScript Styleguide

On lisk-template we are using [Prettier](https://prettier.io/) and
[ESLint](https://eslint.org/). Our ESLint style expands
[Airbnb’s](https://github.com/airbnb/javascript) style settings and expresses
some opinions not covered by Prettier’s formatting concerns. You can get more
details here: https://github.com/LiskHQ/eslint-config-lisk-base

These contribution guidelines were inspired by and are based on Atom’s
contribution guidelines. They were modified for the purposes of this repository.
https://github.com/atom/atom/blob/master/CONTRIBUTING.md - Copyright (c)
2011-2017 GitHub Inc. (MIT)
