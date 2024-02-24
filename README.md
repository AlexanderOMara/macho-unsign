# Mach-O Unsign

Package for removing Mach-O code signatures

[![npm](https://img.shields.io/npm/v/macho-unsign.svg)](https://npmjs.com/package/macho-unsign)
[![node](https://img.shields.io/node/v/macho-unsign.svg)](https://nodejs.org)

[![size](https://packagephobia.now.sh/badge?p=macho-unsign)](https://packagephobia.now.sh/result?p=macho-unsign)
[![downloads](https://img.shields.io/npm/dm/macho-unsign.svg)](https://npmcharts.com/compare/macho-unsign?minimal=true)

[![Build Status](https://github.com/AlexanderOMara/macho-unsign/workflows/main/badge.svg)](https://github.com/AlexanderOMara/macho-unsign/actions?query=workflow%3Amain+branch%3Amaster)

# Overview

A broken code signature is often worse than no signature, so it can be desirable to remove a signature.

This package can remove code signatures from Mach-O binaries.

Both thin and fat binaries are supported.

# Usage

Just pass an `ArrayBuffer` or an object that is a view of an `ArrayBuffer` to the `unsign` function.

If the binary is signed, an unsigned binary in a new `ArrayBuffer` will be returned.

If the binary has no signatures, `null` will be returned.

```js
import {readFile, writeFile} from 'node:fs/promises';
import {unsign} from 'macho-unsign';

const unsigned = unsign(await readFile('macho-binary'));
if (unsigned) {
	console.log('Signature Removed', unsigned);
	await writeFile('macho-binary-unsigned', Buffer.from(unsigned));
} else {
	console.log('Not signed');
}
```

# Bugs

If you find a bug or have compatibility issues, please open a ticket under issues section for this repository.

# License

Copyright (c) 2019-2024 Alexander O'Mara

Licensed under the Mozilla Public License, v. 2.0.

If this license does not work for you, feel free to contact me.
