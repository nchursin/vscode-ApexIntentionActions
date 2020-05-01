import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';

import { getFirstNonVarDefnLine, getSymbolAtLine } from '@src/lib/utils';
import { keys } from 'ramda';
import { stub } from "sinon";
import { LanguageClient } from 'vscode-languageclient';
import { getStubLanguageClient } from '@testutils';

const NON_VAR_LINE_TEST_CASES = {
    'Test1': 2,
    'Test2': 7,
    'Test3': 9,
    'Test4': 8,
    'Test5': 12,
    'Test6': 12,
    'Test7': 13,
    'Test8': 1,
};

const CURRENT_DOC_SYMBOL = {
    'Test1': {
        position: new vscode.Position(1, 23),
        symbol: {
            'name': 'stringVar : String',
            'kind': 8,
            'location': {
                'uri': 'file:///Users/nchursin/Documents/Projects/apex-intention-actions/src/test/data/PositionTests/NonVarPositions/Test1/Class.cls',
                'range': {
                    'start': {
                        'line': 1,
                        'character': 18
                    },
                    'end': {
                        'line': 1,
                        'character': 27
                    }
                }
            }
        },
    },
    'Test2': {
        position: new vscode.Position(0, 10),
        symbol: {
            'name': 'Test',
            'kind': 5,
            'location': {
                'uri': 'file:///Users/nchursin/Documents/Projects/apex-intention-actions/src/test/suite/lib/lineType/data/PositionTests/NonVarPositions/Test2/Class.cls',
                'range': {
                    'start': {
                        'line': 0,
                        'character': 13
                    },
                    'end': {
                        'line': 0,
                        'character': 17
                    }
                }
            }
        },
    },
    'Test5': {
        position: new vscode.Position(12, 15),
        symbol: {
            'name': 'something() : String',
            'kind': 6,
            'location': {
                'uri': 'file:///Users/nchursin/Documents/Projects/apex-intention-actions/src/test/suite/lib/lineType/data/PositionTests/NonVarPositions/Test5/Class.cls',
                'range': {
                    'start': {
                        'line': 12,
                        'character': 18
                    },
                    'end': {
                        'line': 12,
                        'character': 27
                    }
                }
            }
        },
    },
};

suite('Line Type Analyzer Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

    test('get documentSymbol on current position', async () => {
        const cases = keys(CURRENT_DOC_SYMBOL);
        await Promise.all(cases.map(async (fileName) => {

            const testCaseMeta = CURRENT_DOC_SYMBOL[fileName];
            const expected = testCaseMeta.symbol;
            const position = testCaseMeta.position;
            const dataFolder = path.resolve(__dirname);
            const testClass = path.join(dataFolder, 'data', fileName, 'Class.cls');

            const langClient = new LanguageClient('', { command: '' }, {});
            const documentSymbolFile = path.join(dataFolder, 'data', fileName, 'documentSymbol.json');
            const documentSymbolString = await fs.promises.readFile(documentSymbolFile, 'utf8');
            const documentSymbol = JSON.parse(documentSymbolString);
            stub(langClient, 'sendRequest').returns(Promise.resolve(documentSymbol));

            const textDocument = await vscode.workspace.openTextDocument(testClass);

            const actual = await getSymbolAtLine(position.line, textDocument, langClient);
            assert.deepEqual(actual, expected, `First non-ver defn line number is different from expected for test: ${fileName}`);
            return Promise.resolve();
        }));
    });

    test('get first non-var defn line number', async () => {
        const cases = keys(NON_VAR_LINE_TEST_CASES);
        await Promise.all(cases.map(async (fileName) => {

            const expected = NON_VAR_LINE_TEST_CASES[fileName];
            const dataFolder = path.resolve(__dirname, 'data', fileName);
            const testClass = path.join(dataFolder, 'Class.cls');
            const textDocument = await vscode.workspace.openTextDocument(testClass);

            const langClient = await getStubLanguageClient(dataFolder);

            const actual = await getFirstNonVarDefnLine(textDocument, langClient);
            assert.equal(actual, expected, `First non-ver defn line number is different from expected for test: ${fileName}`);
            return Promise.resolve();
        }));

    });
});