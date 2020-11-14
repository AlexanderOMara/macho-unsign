#!/bin/bash

archs=(
	'arm64 arm64-apple-macos11'
)
samples=(
	'main'
)
builddir='build'
sdk='/Library/Developer/CommandLineTools/SDKs/MacOSX11.0.sdk'
minver='-mmacosx-version-min=11.0'
includes="-I$sdk/usr/include"

mkdir -p "$builddir"
for sample in "${samples[@]}"; do
	for arch in "${archs[@]}"; do
		target=${arch##* }
		name=${arch%% *}

		flags="-target $target -isysroot $sdk $includes $minver"
		clang $flags -o "$builddir/$sample.$name.slim.notsigned" "src/$sample.c"

		# Always ad hoc signed, so remove.
		codesign --remove-signature "$builddir/$sample.$name.slim.notsigned"
	done
done
