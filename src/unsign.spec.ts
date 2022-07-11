import {readFile} from 'fs';
import {promisify} from 'util';
import {createHash} from 'crypto';

const readFileP = promisify(readFile);

import {unsign} from './unsign';

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
	return readFileP(`spec/fixtures/macho/build/${name}.${type}`);
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

describe('unsign', () => {
	describe('unsign', () => {
		for (const sample of genSamples()) {
			// eslint-disable-next-line no-loop-func
			it(sample, async () => {
				const signed = await readSampleSigned(sample);
				const notsigned = await readSampleNotsigned(sample);
				const unsigned = await readSampleUnsigned(sample);

				const signedUnchanged = ensureUnchanged(signed);
				const signedUnsigned = unsign(signed);
				if (signedUnsigned) {
					const signedUnsignedB = Buffer.from(signedUnsigned);
					expect(signedUnsignedB.equals(unsigned)).toBeTrue();
				} else {
					expect(signedUnsigned).not.toBeNull();
				}
				signedUnchanged();

				const notsignedUnchanged = ensureUnchanged(notsigned);
				const notsignedUnsigned = unsign(notsigned);
				expect(notsignedUnsigned).toBeNull();
				notsignedUnchanged();
			});
		}
	});
});
