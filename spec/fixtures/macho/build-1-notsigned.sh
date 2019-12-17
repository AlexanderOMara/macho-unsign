#!/bin/bash

archs=(
	'ppc'
	'ppc64'
	'ppc970'
	'i386'
	'x86_64'
)
samples=(
	'main'
)
builddir='build'
sdk='/Developer/SDKs/MacOSX10.4u.sdk'
minver='-mmacosx-version-min=10.3'
includes="-I$sdk/usr/include"

mkdir -p "$builddir"
for sample in "${samples[@]}"; do
	for arch in "${archs[@]}"; do
		flags="-arch $arch -isysroot $sdk $includes $minver"
		gcc $flags -o "$builddir/$sample.$arch.slim.notsigned" "src/$sample.c"
	done
done
