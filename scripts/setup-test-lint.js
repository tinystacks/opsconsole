const fs = require('fs');
const path = require('path');

const lintRc = fs.readFileSync(path.resolve(__dirname, '../.eslintrc')).toString();
const testLintRc = JSON.parse(lintRc);
testLintRc.parserOptions.project = ['tsconfig.test.json'];
fs.writeFileSync(path.resolve(__dirname, '../.eslintrc.test.json'), JSON.stringify(testLintRc, null, 2));

const tsConfig = fs.readFileSync(path.resolve(__dirname, '../tsconfig.json')).toString();
const testTsConfig = JSON.parse(tsConfig);
testTsConfig.compilerOptions.outDir = './test-dist';
testTsConfig.include = ['test'];
fs.writeFileSync(path.resolve(__dirname, '../tsconfig.test.json'), JSON.stringify(testTsConfig, null, 2));