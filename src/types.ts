export type ArrayBuffers = ArrayBuffer | SharedArrayBuffer;

export interface IArrayBufferView {

	/**
	 * The expected buffer property.
	 */
	buffer: Readonly<ArrayBuffers>;

	/**
	 * The expected byteLength property.
	 */
	byteLength: number;

	/**
	 * The expected byteOffset property.
	 */
	byteOffset: number;
}
