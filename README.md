# macho-unsign

Package for removing Mach-O code signatures

[![npm](https://img.shields.io/npm/v/macho-unsign.svg)](https://npmjs.com/package/macho-unsign)
[![node](https://img.shields.io/node/v/macho-unsign.svg)](https://nodejs.org)

[![dependencies](https://david-dm.org/AlexanderOMara/macho-unsign.svg)](https://david-dm.org/AlexanderOMara/macho-unsign)
[![size](https://packagephobia.now.sh/badge?p=macho-unsign)](https://packagephobia.now.sh/result?p=macho-unsign)
[![downloads](https://img.shields.io/npm/dm/macho-unsign.svg)](https://npmcharts.com/compare/macho-unsign?minimal=true)

[![travis-ci](https://travis-ci.org/AlexanderOMara/macho-unsign.svg?branch=master)](https://travis-ci.org/AlexanderOMara/macho-unsign)


# Overview

A broken code signature is worse than no signature, so it can be desirable to remove a signature.

This package can remove code signatures from Mach-O binaries.

Both thin and fat binaries are supported.


# Usage

Just pass an `ArrayBuffer` or an object that is a view of an `ArrayBuffer` to the `unsign` function.

If the binary is signed, an unsigned binary in a new `ArrayBuffer` will be returned.

If the binary has no signatures, `null` will be returned.

```js
import fs from 'fs';
import {unsign} from 'macho-unsign';

const unsigned = unsign(fs.readFileSync('macho-binary'));
if (unsigned) {
	console.log('Signature Removed', unsigned);
	fs.writeFileSync('macho-binary-unsigned', Buffer.from(unsigned));
}
else {
	console.log('Not signed');
}
```


# Bugs

If you find a bug or have compatibility issues, please open a ticket under issues section for this repository.


# License

Copyright (c) 2019 Alexander O'Mara

Licensed under the Mozilla Public License, v. 2.0.

If this license does not work for you, feel free to contact me.
