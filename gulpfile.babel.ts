import fs from 'fs';
import path from 'path';
import stream from 'stream';
import util from 'util';

import gulp from 'gulp';
import gulpRename from 'gulp-rename';
import gulpInsert from 'gulp-insert';
import gulpFilter from 'gulp-filter';
import gulpReplace from 'gulp-replace';
import gulpSourcemaps from 'gulp-sourcemaps';
import gulpBabel from 'gulp-babel';
import execa from 'execa';
import del from 'del';

const readFile = util.promisify(fs.readFile);
const pipeline = util.promisify(stream.pipeline);

async function exec(cmd: string, args: string[] = []) {
	await execa(cmd, args, {
		preferLocal: true,
		stdio: 'inherit'
	});
}

async function packageJSON() {
	return JSON.parse(await readFile('package.json', 'utf8'));
}

async function babelrc() {
	return {
		...JSON.parse(await readFile('.babelrc', 'utf8')),
		babelrc: false
	};
}

async function babelTarget(
	src: string[],
	dest: string,
	modules: string | boolean
) {
	// Change module.
	const babelOptions = await babelrc();
	for (const preset of babelOptions.presets) {
		if (preset[0] === '@babel/preset-env') {
			preset[1].modules = modules;
		}
	}
	if (!modules) {
		babelOptions.plugins.push([
			'esm-resolver', {
				source: {
					extensions: [
						[
							['.js', '.mjs', '.jsx', '.mjsx', '.ts', '.tsx'],
							'.mjs'
						]
					]
				}
			}
		]);
	}

	// Read the package JSON.
	const pkg = await packageJSON();

	// Filter meta data file and create replace transform.
	const filterMeta = gulpFilter(['*/meta.ts'], {restore: true});
	const filterMetaReplaces = [
		["'@VERSION@'", JSON.stringify(pkg.version)],
		["'@NAME@'", JSON.stringify(pkg.name)]
	].map(([f, r]) => gulpReplace(f, r));

	await pipeline(
		gulp.src(src),
		filterMeta,
		...filterMetaReplaces,
		filterMeta.restore,
		gulpSourcemaps.init(),
		gulpBabel(babelOptions),
		gulpRename(path => {
			if (!modules && path.extname === '.js') {
				path.extname = '.mjs';
			}
		}),
		gulpSourcemaps.write('.', {
			includeContent: true,
			addComment: false,
			destPath: dest
		}),
		gulpInsert.transform((contents, file) => {
			// Manually append sourcemap comment.
			if (/\.m?js$/i.test(file.path)) {
				const base = path.basename(file.path);
				return `${contents}\n//# sourceMappingURL=${base}.map\n`;
			}
			return contents;
		}),
		gulp.dest(dest)
	);
}

// clean

gulp.task('clean:logs', async () => {
	await del([
		'npm-debug.log*',
		'yarn-debug.log*',
		'yarn-error.log*'
	]);
});

gulp.task('clean:lib', async () => {
	await del([
		'lib'
	]);
});

gulp.task('clean', gulp.parallel([
	'clean:logs',
	'clean:lib'
]));

// lint

gulp.task('lint:es', async () => {
	await exec('eslint', ['.']);
});

gulp.task('lint', gulp.parallel([
	'lint:es'
]));

// build

gulp.task('build:dts', async () => {
	await exec('tsc');
});

gulp.task('build:cjs', async () => {
	await babelTarget(['src/**/*.ts'], 'lib', 'commonjs');
});

gulp.task('build:mjs', async () => {
	await babelTarget(['src/**/*.ts'], 'lib', false);
});

gulp.task('build', gulp.parallel([
	'build:dts',
	'build:cjs',
	'build:mjs'
]));

// test

gulp.task('test:cjs', async () => {
	await exec('jasmine');
});

gulp.task('test:esm', async () => {
	await exec('jasmine', ['--config=spec/support/jasmine.esm.json']);
});

gulp.task('test', gulp.series(['test:cjs', 'test:esm']));

// watch

gulp.task('watch', () => {
	gulp.watch([
		'src/**/*'
	], gulp.series([
		'all'
	]));
});

// all

gulp.task('all', gulp.series([
	'clean',
	'build',
	'test',
	'lint'
]));

// prepack

gulp.task('prepack', gulp.series([
	'clean',
	'build'
]));

// default

gulp.task('default', gulp.series([
	'all'
]));
