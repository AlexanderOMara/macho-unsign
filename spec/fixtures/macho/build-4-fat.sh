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
	sufs=(
		'notsigned'
		'signed'
		'unsigned'
	)
	for suf in "${sufs[@]}"; do
		slims=''
		for arch in "${archs[@]}"; do
			slim="$builddir/$sample.$arch.slim.$suf"
			slims="$slims $slim"
			lipo -output "$builddir/$sample.$arch.fat.$suf" -create "$slim"
		done
		lipo -output "$builddir/$sample.fat.$suf" -create $slims
	done
done
