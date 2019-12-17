import {
	ArrayBuffers,
	IArrayBufferView
} from './types';

const LC_SEGMENT = 0x01;
const LC_SEGMENT_64 = 0x19;
const LC_DYLD_INFO = 0x22;
const LC_DYLD_INFO_ONLY = 0x80000022;
const LC_SYMTAB = 0x02;
const LC_DYSYMTAB = 0x0B;
const LC_FUNCTION_STARTS = 0x26;
const LC_DATA_IN_CODE = 0x29;
const ENCRYPTION_INFO = 0x21;
const ENCRYPTION_INFO_64 = 0x2C;
const LC_CODE_SIGNATURE = 0x1D;

/**
 * Encode address for display.
 *
 * @param value Address value.
 * @returns Encoded address.
 */
function address(value: number) {
	return `0x${value.toString(16).toUpperCase()}`;
}

/**
 * Convert buffer-like object to DataView.
 *
 * @param data Data view.
 * @returns Data view.
 */
function dataAsDataView(data: Readonly<ArrayBuffers | IArrayBufferView>) {
	let size;
	let offset;
	const bufferView = data as IArrayBufferView;
	let {buffer} = bufferView;
	if (buffer) {
		size = bufferView.byteLength;
		offset = bufferView.byteOffset;
	}
	else {
		buffer = data as ArrayBuffers;
		size = buffer.byteLength;
		offset = 0;
	}
	return (
		new DataView(buffer as ArrayBuffers, offset, size)
	) as Readonly<DataView>;
}

/**
 * Read ASCII string from data view.
 *
 * @param dv Data view.
 * @param offset String offset.
 * @param size String data max size.
 * @returns The string.
 */
function dataViewAscii(dv: Readonly<DataView>, offset: number, size: number) {
	let str = '';
	for (let i = 0; i < size; i++) {
		const v = dv.getUint8(offset + i);
		if (!v) {
			return str;
		}
		str += String.fromCharCode(v);
	}
	throw new Error('String did not end within range');
}

/**
 * Get data view slice, using same underlying buffer.
 *
 * @param dv Data view.
 * @param offset View offset.
 * @param size View size.
 * @returns Data view.
 */
function dataViewSlice(dv: Readonly<DataView>, offset: number, size: number) {
	return new DataView(
		dv.buffer,
		dv.byteOffset + offset,
		size
	) as Readonly<DataView>;
}

/**
 * Copy data view slice, copying the underlying buffer.
 *
 * @param dv Data view.
 * @param offset Copy offset.
 * @param size Copy size.
 * @returns Data buffer.
 */
function dataViewCopy(dv: Readonly<DataView>, offset: number, size: number) {
	const start = dv.byteOffset + offset;
	return dv.buffer.slice(start, start + size);
}

/**
 * Concatenate data view list.
 *
 * @param dvs Data views.
 * @param total Total size, optional, otherwise computed from the list.
 * @returns Array buffer.
 */
function dataViewConcat(
	dvs: Readonly<DataView>[],
	total: number | null = null
) {
	// Calculate size if necessary.
	const size = total === null ?
		dvs.reduce((a, b) => a + b.byteLength, 0) :
		total;

	// Write all the data to one array buffer.
	const concat = new ArrayBuffer(size);
	let offset = 0;
	for (const {buffer, byteOffset, byteLength} of dvs) {
		(new Uint8Array(concat, offset, byteLength)).set(
			new Uint8Array(buffer, byteOffset, byteLength),
			0
		);
		offset += byteLength;
	}
	return concat;
}

/**
 * Unsign Mach-O, thin format.
 *
 * @param data Mach-O data.
 * @returns Mach-O data unsigned or null if no signature removed.
 */
function unsignThin(data: Readonly<ArrayBuffers | IArrayBufferView>) {
	const dv = dataAsDataView(data);

	let bits = 0;
	let le = false;
	let align = 0;

	// Read helpers.
	const rU32 = (offset: number) => dv.getUint32(offset, le);
	const rU64 = (offset: number) => {
		const h = rU32(le ? (offset + 4) : offset);
		const l = rU32(le ? offset : (offset + 4));
		if (h > 0) {
			throw new Error('Integer is too large');
		}
		return l;
	};

	// Detect header.
	const magic = rU32(0);
	switch (magic) {
		case 0xFEEDFACE: {
			bits = 32;
			align = 4;
			break;
		}
		case 0xCEFAEDFE: {
			bits = 32;
			align = 4;
			le = true;
			break;
		}
		case 0xFEEDFACF: {
			bits = 64;
			align = 8;
			break;
		}
		case 0xCFFAEDFE: {
			bits = 64;
			align = 8;
			le = true;
			break;
		}
		default: {
			throw new Error(`Unexpected header magic: ${address(magic)}`);
		}
	}

	// Read number and size of commands.
	const ncmds = rU32(16);
	const sizeofcmds = rU32(20);

	// Code signature value offsets.
	let csCommandOffset = 0;
	let csCommandSize = 0;
	let csDataOffset = 0;
	let csDataSize = 0;

	// __LINKEDIT offsets.
	let linkedit32Offset = 0;
	let linkedit64Offset = 0;

	// A variable for where tha Mach-O should end.
	let end = 0;
	const far = (offset: number) => {
		if (offset > end) {
			end = offset;
		}
	};

	// Loop over load commands.
	let offset = bits === 64 ? 0x20 : 0x1c;
	far(offset + sizeofcmds);
	for (let i = 0; i < ncmds; i++) {
		const type = rU32(offset);
		const size = rU32(offset + 4);

		// Signature should be the last command.
		if (csCommandOffset) {
			throw new Error(
				`Unexpected command after signature: ${address(offset)}`
			);
		}

		// Handle those types that need updating or might define the file end.
		switch (type) {
			case LC_SEGMENT: {
				const name = dataViewAscii(dv, offset + 8, offset + 24);

				// __LINKEDIT commands includes code signature size.
				if (name === '__LINKEDIT') {
					if (linkedit32Offset) {
						const addr = address(offset);
						throw new Error(
							`Unexpected second LC_SEGMENT ${name}: ${addr}`
						);
					}
					linkedit32Offset = offset + 36;
					break;
				}

				// File offset and size.
				far(rU32(offset + 32) + rU32(offset + 36));
				break;
			}
			case LC_SEGMENT_64: {
				const name = dataViewAscii(dv, offset + 8, offset + 24);

				// __LINKEDIT commands includes code signature size.
				if (name === '__LINKEDIT') {
					if (linkedit64Offset) {
						const addr = address(offset);
						throw new Error(
							`Unexpected second LC_SEGMENT_64 ${name}: ${addr}`
						);
					}
					linkedit64Offset = offset + 48;
					break;
				}

				// File offset and size.
				far(rU64(offset + 40) + rU64(offset + 48));
				break;
			}
			case LC_DYLD_INFO:
			case LC_DYLD_INFO_ONLY: {
				// Rebase, Binding, Weak Binding, Laxy Binding, and Export.
				far(rU32(offset + 8) + rU32(offset + 12));
				far(rU32(offset + 16) + rU32(offset + 20));
				far(rU32(offset + 24) + rU32(offset + 28));
				far(rU32(offset + 32) + rU32(offset + 36));
				far(rU32(offset + 40) + rU32(offset + 44));
				break;
			}
			case LC_SYMTAB: {
				// Symbol table offset and symbol count, 12 bytes each.
				far(rU32(offset + 8) + (rU32(offset + 12) * 12));
				// String table offset and size.
				far(rU32(offset + 16) + rU32(offset + 20));
				break;
			}
			case LC_DYSYMTAB: {
				// Are the other tables ever used? If so how large are entries?
				// IndSym offset and entry count, 4 bytes each.
				far(rU32(offset + 56) + (rU32(offset + 60) * 4));
				break;
			}
			case LC_FUNCTION_STARTS:
			case LC_DATA_IN_CODE:
			case ENCRYPTION_INFO:
			case ENCRYPTION_INFO_64: {
				// Data offset and size.
				far(rU32(offset + 8) + rU32(offset + 12));
				break;
			}
			case LC_CODE_SIGNATURE: {
				// Remember code signature entry to update.
				csCommandOffset = offset;
				csCommandSize = size;
				csDataOffset = rU32(offset + 8);
				csDataSize = rU32(offset + 12);
				break;
			}
			default: {
				// Do nothing.
			}
		}

		offset += size;
	}

	// No sigature, return null.
	if (!csCommandOffset) {
		return null;
	}

	// Calculate signature end which should be at end of file.
	const csDataEnd = csDataOffset + csDataSize;
	if (data.byteLength !== csDataEnd) {
		throw new Error(
			`Unexpected data after code signature: ${address(csDataEnd)}`
		);
	}

	// Make sure end is before code signature, and with alignment amount.
	if (end > csDataOffset) {
		throw new Error(
			`Unexpected command data after signature start: ${address(end)}`
		);
	}
	const padSize = csDataOffset - end;
	if ((csDataOffset - end) > align) {
		throw new Error(
			`Unexpected amount of padding before signature start: ${padSize}`
		);
	}

	// Calculate the amout removed.
	const reduced = dv.byteLength - end;

	// Copy data, trimming off code signature and padding before it.
	const unsigned = new DataView(dataViewCopy(dv, 0, end));

	// Write helpers.
	const wU32 = (value: number, offset: number) => {
		unsigned.setUint32(offset, value, le);
	};
	const wU64 = (value: number, offset: number) => {
		wU32(le ? value : 0, offset);
		wU32(le ? 0 : value, offset + 4);
	};

	// Reduce __LINKEDIT file size by the amout trimmed.
	if (linkedit32Offset) {
		wU32(rU32(linkedit32Offset) - reduced, linkedit32Offset);
	}
	if (linkedit64Offset) {
		wU64(rU64(linkedit64Offset) - reduced, linkedit64Offset);
	}

	// Null out code signature load command.
	for (let i = 0; i < csCommandSize; i++) {
		unsigned.setUint8(csCommandOffset + i, 0);
	}

	// Reduce the number of load commands by one, and shrink commands size.
	wU32(ncmds - 1, 16);
	wU32(sizeofcmds - csCommandSize, 20);

	// Return the array buffer.
	return unsigned.buffer;
}

/**
 * Unsign Mach-O, fat format.
 *
 * @param data Mach-O data.
 * @returns Mach-O data unsigned or null if no signature removed.
 */
function unsignFat(data: Readonly<ArrayBuffers | IArrayBufferView>) {
	const dv = dataAsDataView(data);
	const rU32 = (offset: number) => dv.getUint32(offset, false);

	// Binaries to be joined in new fat binary.
	let didUnsign = false;
	const pieces: Readonly<{
		cpuType: number;
		cpuSubtype: number;
		align: number;
		unsigned: Readonly<DataView>;
	}>[] = [];

	// Read all the fat binary images.
	const magic = rU32(0);
	const archs = rU32(4);
	let off = 8;
	for (let i = 0; i < archs; i++) {
		const cpuType = rU32(off);
		const cpuSubtype = rU32(off + 4);
		const offset = rU32(off + 8);
		const size = rU32(off + 12);
		const align = rU32(off + 16);

		// Unsign if necessary, remember if any were unsigned.
		const maybeSigned = dataViewSlice(dv, offset, size);
		const maybeUnsigned = unsign(maybeSigned);
		if (maybeUnsigned) {
			didUnsign = true;
		}
		const unsigned = maybeUnsigned ?
			dataAsDataView(maybeUnsigned) :
			maybeSigned;

		// Add to the list.
		pieces.push({
			cpuType,
			cpuSubtype,
			align,
			unsigned
		});

		off += 20;
	}

	// No signatures, return null.
	if (!didUnsign) {
		return null;
	}

	// Create a list of all the parts to be concatenated.
	const concat: Readonly<DataView>[] = [];

	// Create header.
	const headerSize = 8 + (archs * 20);
	const header = new DataView(new ArrayBuffer(headerSize));
	const wU32 = (value: number, offset: number) => {
		header.setUint32(offset, value, false);
	};
	wU32(magic, 0);
	wU32(archs, 4);
	concat.push(header);

	// Add body pieces and update header.
	let headerOff = 8;
	let bodyOff = headerSize;
	pieces.reverse();
	for (;;) {
		const entry = pieces.pop();
		if (!entry) {
			break;
		}

		// Validate the align value.
		const {unsigned, align} = entry;
		if (align > 31) {
			throw new Error(`Invalid alignment value: ${align}`);
		}
		// eslint-disable-next-line no-bitwise
		const alignTo = (1 << align) >>> 0;
		const size = unsigned.byteLength;

		// Add padding to align if necessary.
		const unaligned = bodyOff % alignTo;
		if (unaligned) {
			const pad = alignTo - unaligned;
			concat.push(new DataView(new ArrayBuffer(pad)));
			bodyOff += pad;
		}

		// Write header.
		wU32(entry.cpuType, headerOff);
		wU32(entry.cpuSubtype, headerOff + 4);
		wU32(bodyOff, headerOff + 8);
		wU32(size, headerOff + 12);
		wU32(align, headerOff + 16);
		headerOff += 20;

		// Add body and update the offset.
		concat.push(unsigned);
		bodyOff += size;
	}

	return dataViewConcat(concat, bodyOff);
}

/**
 * Unsign Mach-O.
 *
 * @param data Mach-O data.
 * @returns Mach-O data unsigned or null if no signature removed.
 */
export function unsign(data: Readonly<ArrayBuffers | IArrayBufferView>) {
	if (dataAsDataView(data).getUint32(0, false) === 0xCAFEBABE) {
		return unsignFat(data);
	}
	return unsignThin(data);
}
