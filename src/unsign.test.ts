import {describe, it} from 'node:test';
import {strictEqual, notStrictEqual} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

import {unsign} from './unsign.ts';

const samples = ['main'];

const archs = ['ppc', 'ppc64', 'ppc970', 'i386', 'x86_64', 'arm64'];

function* genSamples() {
	for (const sample of samples) {
		for (const arch of archs) {
			yield `${sample}.${arch}.slim`;
			yield `${sample}.${arch}.fat`;
		}
		yield `${sample}.fat`;
	}
}

async function readSample(name: string, type: string) {
	return readFile(`spec/fixtures/macho/build/${name}.${type}`);
}

async function readSampleNotsigned(name: string) {
	return readSample(name, 'notsigned');
}

async function readSampleSigned(name: string) {
	return readSample(name, 'signed');
}

async function readSampleUnsigned(name: string) {
	return readSample(name, 'unsigned');
}

function sha256(data: Buffer) {
	return createHash('sha256').update(data).digest('hex');
}

function ensureUnchanged(data: Buffer) {
	const hash = sha256(data);
	return () => {
		const hash2 = sha256(data);
		if (hash2 !== hash) {
			throw new Error('Buffer changed');
		}
	};
}

void describe('unsign', () => {
	void describe('unsign', () => {
		for (const sample of genSamples()) {
			void it(sample, async () => {
				const signed = await readSampleSigned(sample);
				const notsigned = await readSampleNotsigned(sample);
				const unsigned = await readSampleUnsigned(sample);

				const signedUnchanged = ensureUnchanged(signed);
				const signedUnsigned = unsign(signed);
				if (signedUnsigned) {
					const signedUnsignedB = Buffer.from(signedUnsigned);
					strictEqual(signedUnsignedB.equals(unsigned), true);
				} else {
					notStrictEqual(signedUnsigned, null);
				}
				signedUnchanged();

				const notsignedUnchanged = ensureUnchanged(notsigned);
				const notsignedUnsigned = unsign(notsigned);
				strictEqual(notsignedUnsigned, null);
				notsignedUnchanged();
			});
		}
	});
});
