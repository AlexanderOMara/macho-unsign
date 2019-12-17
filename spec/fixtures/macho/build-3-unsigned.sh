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

for sample in "${samples[@]}"; do
	for arch in "${archs[@]}"; do
		cp "$builddir/$sample.$arch.slim.signed" "$builddir/$sample.$arch.slim.unsigned"
		codesign --remove-signature "$builddir/$sample.$arch.slim.unsigned"
	done
done
