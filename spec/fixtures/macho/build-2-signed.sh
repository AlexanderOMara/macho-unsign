#!/bin/bash

archs=(
	'ppc'
	'ppc64'
	'ppc970'
	'i386'
	'x86_64'
	'arm64'
)
samples=(
	'main'
)
builddir='build'

for sample in "${samples[@]}"; do
	for arch in "${archs[@]}"; do
		cp "$builddir/$sample.$arch.slim.notsigned" "$builddir/$sample.$arch.slim.signed"
		sudo codesign -fs - "$builddir/$sample.$arch.slim.signed"
	done
done
