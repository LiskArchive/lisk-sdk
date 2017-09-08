# Contributing to Lisk-JS

:+1::tada: First off, thanks for taking the time to contribute! :tada::+1:

The following is a set of guidelines for contributing to Lisk-JS, which are hosted in the [LiskHQ Organization](https://github.com/LiskHQ) on GitHub. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## Code of Conduct

This project and everyone participating in it is governed by the [Lisk-JS Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [info@lisk.io](mailto:info@lisk.io).

## Project License

Every repository within LiskHQ comes with a LICENSE file. Please read it carefully before commiting your code to one of the repositories.


## I don't want to read this whole thing I just have a question!!!

Lisk is an open-source decentralized project, there are many ways and platforms to get help. These are some of them

* [Discuss and Ask on Reddit](https://www.reddit.com/r/Lisk/)
* [Lisk FAQ](https://docs.lisk.io/docs/faq)

If chat is more your speed, you can join the LiskHQ Gitter:

* [Join the LiskHQ Gitter](https://gitter.im/LiskHQ/lisk)
* Even though Gitter is a chat service, sometimes it takes several hours for community members to respond &mdash; please be patient!
   
## How Can I Contribute?

LiskHQ uses GitHub as its sole source of truth. Everything happens here. Lightcurve employees who contribute to Lisk are expected to do so in the same way as everyone else. In other words, this document applies equally to all contributors.

### `master` is unsafe

We will do our best to keep `master` in good shape, with tests passing at all times. But in order to move fast, we will make API changes that your application might not be compatible with. We will do our best to communicate these changes and always version appropriately so you can lock into a specific version if need be.

### Pull Requests

In case you've never submitted a pull request (PR) via GitHub before, please read [this short tutorial](https://help.github.com/articles/creating-a-pull-request). If you've submitted a PR before, there should be nothing surprising about our procedures for Lisk.

*Before* submitting a pull request, please make sure the following is done:

1. Fork the repo and create your branch from `master`.
2. If you've added code that should be tested, add tests!
3. Ensure the test suite passes (`npm test`).
4. Submit a pull request via GitHub.
5. Check that Jenkins CI tests pass (pull request turns green).

### Reporting Bugs

This section guides you through submitting a bug report for Lisk-JS. Following these guidelines helps maintainers and the community understand your report :pencil:, reproduce the behavior :computer: :computer:, and find related reports :mag_right:.

Before creating bug reports, please check [this list](#before-submitting-a-bug-report) as you might find out that you don't need to create one. When you are creating a bug report, please [include as many details as possible](#how-do-i-submit-a-good-bug-report). Fill out [the required template](ISSUE_TEMPLATE.md), the information it asks for helps us resolve issues faster.

> **Note:** If you find a **Closed** issue that seems like it is the same thing that you're experiencing, open a new issue and include a link to the original issue in the body of your new one.

#### Before Submitting A Bug Report

* **Check the [FAQs](https://docs.lisk.io/docs/faq)** for a list of common questions and problems.
* **Determine [which repository the problem should be reported in](https://github.com/LiskHQ)**.
* **Perform a [cursory search](https://github.com/search?utf8=%E2%9C%93&q=+is%3Aissue+org%3ALiskHQ&type=)** to see if the problem has already been reported. If it has **and the issue is still open**, add a comment to the existing issue instead of opening a new one.

#### How Do I Submit A (Good) Bug Report?

Bugs are tracked as [GitHub issues](https://guides.github.com/features/issues/). After you've determined [which repository](https://github.com/LiskHQ) your bug is related to, create an issue on that repository and provide the following information by filling in [the template](ISSUE_TEMPLATE.md).

Explain the problem and include additional details to help maintainers reproduce the problem:

* **Use a clear and descriptive title** for the issue to identify the problem.
* **Describe the exact steps which reproduce the problem** in as many details as possible. For example, start by explaining how you started Atom, e.g. which command exactly you used in the terminal, or how you started Atom otherwise. When listing steps, **don't just say what you did, but explain how you did it**. For example, if you moved the cursor to the end of a line, explain if you used the mouse, or a keyboard shortcut or an Atom command, and if so which one?
* **Provide specific examples to demonstrate the steps**. Include links to files or GitHub projects, or copy/pasteable snippets, which you use in those examples. If you're providing snippets in the issue, use [Markdown code blocks](https://help.github.com/articles/markdown-basics/#multiple-lines).
* **Describe the behavior you observed after following the steps** and point out what exactly is the problem with that behavior.
* **Explain which behavior you expected to see instead and why.**
* **Include screenshots and animated GIFs** which show you following the described steps and clearly demonstrate the problem. If you use the keyboard while following the steps, **record the GIF with the [Keybinding Resolver](https://github.com/atom/keybinding-resolver) shown**. You can use [this tool](http://www.cockos.com/licecap/) to record GIFs on macOS and Windows, and [this tool](https://github.com/colinkeenan/silentcast) or [this tool](https://github.com/GNOME/byzanz) on Linux.
* **If the problem wasn't triggered by a specific action**, describe what you were doing before the problem happened and share more information using the guidelines below.

Provide more context by answering these questions:

* **Did the problem start happening recently** (e.g. after updating to a new version of Lisk-Js, Lisk or any other repository) or was this always a problem?
* If the problem started happening recently, **can you reproduce the problem in an older version of Lisk-JS?** What's the most recent version in which the problem doesn't happen? You can download older versions of Lisk-JS from [the releases page](https://github.com/LiskHQ/lisk-js/releases).
* **Can you reliably reproduce the issue?** If not, provide details about how often the problem happens and under which conditions it normally happens.
* If the problem is related to working with files (e.g. opening and editing files), **does the problem happen for all files and projects or only some?** Does the problem happen only when working with local or remote files (e.g. on network drives), with files of a specific type (e.g. only JavaScript or Python files), with large files or files with very long lines, or with files in a specific encoding? Is there anything else special about the files you are using?

Include details about your configuration and environment:

* **Which version of Lisk / Lisk-JS are you using?**
* **What's the name and version of the OS you're using**?
* **Are you running Lisk-Js or Lisk in a virtual machine?** If so, which VM software are you using and which operating systems and versions are used for the host and the guest?
* **Are you using [local configuration files](https://docs.lisk.io/v1.2.1/docs/api/)** `config.json`? If so, provide the contents of those files, preferably in a [code block](https://help.github.com/articles/markdown-basics/#multiple-lines) or with a link to a [gist](https://gist.github.com/).

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion for Lisk-JS, including completely new features and minor improvements to existing functionality. Following these guidelines helps maintainers and the community understand your suggestion :pencil: and find related suggestions :mag_right:.

Before creating enhancement suggestions, please check [this list](#before-submitting-an-enhancement-suggestion) as you might find out that you don't need to create one. When you are creating an enhancement suggestion, please [include as many details as possible](#how-do-i-submit-a-good-enhancement-suggestion). Fill in [the template](ISSUE_TEMPLATE.md), including the steps that you imagine you would take if the feature you're requesting existed.

#### How Do I Submit A (Good) Enhancement Suggestion?

Enhancement suggestions are tracked as [GitHub issues](https://guides.github.com/features/issues/). After you've determined [which repository](https://github.com/LiskHQ) your enhancement suggestion is related to, create an issue on that repository and provide the following information:

* **Use a clear and descriptive title** for the issue to identify the suggestion.
* **Provide a step-by-step description of the suggested enhancement** in as many details as possible.
* **Provide specific examples to demonstrate the steps**. Include copy/pasteable snippets which you use in those examples, as [Markdown code blocks](https://help.github.com/articles/markdown-basics/#multiple-lines).
* **Describe the current behavior** and **explain which behavior you expected to see instead** and why.
* **Include screenshots and animated GIFs** which help you demonstrate the steps or point out the part of Atom which the suggestion is related to. You can use [this tool](http://www.cockos.com/licecap/) to record GIFs on macOS and Windows, and [this tool](https://github.com/colinkeenan/silentcast) or [this tool](https://github.com/GNOME/byzanz) on Linux.
* **Explain why this enhancement would be useful** to most Lisk and Lisk-JS users.
* **List some other text editors or applications where this enhancement exists.**
* **Specify which version of Lisk and Lisk-JS you're using.**
* **Specify the name and version of the OS you're using.**

### Pull Requests

* Include issue numbers in the PR title, at the end with: ```Description - Closes #IssueNumber```
* Include screenshots and animated GIFs in your pull request whenever possible.
* Follow the [JavaScript](https://github.com/airbnb/javascript) styleguide from airbnb.
* Document new code based on the [YuiDoc Documentation Styleguide](http://yui.github.io/yuidoc/)
* End all files with a newline
* Every new code must come with complete test coverage
* Update the Readme for the changes that adhere to your new code

## Styleguides

### Git Commit Messages

* Use the present tense ("Add feature" not "Added feature")
* Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
* Limit the first line to 72 characters or less
* Reference issues and pull requests liberally after the first line
* Consider starting the commit message with an applicable emoji:
    * :art: `:art:` when improving the format/structure of the code
    * :racehorse: `:racehorse:` when improving performance
    * :non-potable_water: `:non-potable_water:` when plugging memory leaks
    * :memo: `:memo:` when writing docs
    * :penguin: `:penguin:` when fixing something on Linux
    * :apple: `:apple:` when fixing something on macOS
    * :checkered_flag: `:checkered_flag:` when fixing something on Windows
    * :bug: `:bug:` when fixing a bug
    * :fire: `:fire:` when removing code or files
    * :green_heart: `:green_heart:` when fixing the CI build
    * :white_check_mark: `:white_check_mark:` when adding tests
    * :lock: `:lock:` when dealing with security
    * :arrow_up: `:arrow_up:` when upgrading dependencies
    * :arrow_down: `:arrow_down:` when downgrading dependencies
    * :shirt: `:shirt:` when removing linter warnings

### JavaScript Styleguide

All JavaScript must adhere to [JavaScript Standard Style](http://standardjs.com/).

This Contributing guidelines was inspired by and is based on Atom's contribution guidelines and modified for purposes of this repository: https://github.com/atom/atom/blob/master/CONTRIBUTING.md