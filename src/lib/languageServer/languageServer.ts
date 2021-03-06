/*
* Copyright (c) 2017, salesforce.com, inc.
* All rights reserved.
* Licensed under the BSD 3-Clause license.
* For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/

import * as path from 'path';
import * as vscode from 'vscode';
import {
    Executable,
    LanguageClient,
    LanguageClientOptions,
} from 'vscode-languageclient';
import * as requirements from './requirements';
import { telemetryService } from './telemetry';

const UBER_JAR_NAME = 'apex-jorje-lsp.jar';
const JDWP_DEBUG_PORT = 28375;
const APEX_LANGUAGE_SERVER_MAIN = 'apex.jorje.lsp.ApexLanguageServerLauncher';

declare var v8debug: any;
const DEBUG = typeof v8debug === 'object' || startedInDebugMode();

async function createServer(): Promise<Executable> {
    try {
        const requirementsData = await requirements.resolveRequirements();
        const uberJar = path.resolve(global.assets, UBER_JAR_NAME);
        const javaExecutable = path.resolve(
        `${requirementsData.java_home}/bin/java`
        );
        const jvmMaxHeap = requirementsData.java_memory;

        const enableSemanticErrors: boolean = vscode.workspace
            .getConfiguration()
            .get<boolean>('salesforcedx-vscode-apex.enable-semantic-errors', false);

        const args: string[] = [
            '-cp',
            uberJar,
            '-Ddebug.internal.errors=true',
            `-Ddebug.semantic.errors=${enableSemanticErrors}`
        ];

        if (jvmMaxHeap) {
            args.push(`-Xmx${jvmMaxHeap}M`);
        }

        if (DEBUG) {
            args.push(
                '-Dtrace.protocol=false',
                `-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=${JDWP_DEBUG_PORT},quiet=y`
            );
        }

        args.push(APEX_LANGUAGE_SERVER_MAIN);

        return {
            options: {
                env: process.env,
                stdio: 'pipe'
            },
            command: javaExecutable,
            args
        };
    } catch (err) {
        telemetryService.sendApexLSPError(global.assets);
        vscode.window.showErrorMessage(err);
        telemetryService.sendApexLSPError(err);
        throw err;
    }
}

function startedInDebugMode(): boolean {
    const args = (process as any).execArgv;
    if (args) {
        return args.some(
            (arg: any) =>
            /^--debug=?/.test(arg) ||
            /^--debug-brk=?/.test(arg) ||
            /^--inspect=?/.test(arg) ||
            /^--inspect-brk=?/.test(arg)
        );
    }
    return false;
}

// See https://github.com/Microsoft/vscode-languageserver-node/issues/105
export function code2ProtocolConverter(value: vscode.Uri) {
    if (/^win32/.test(process.platform)) {
        // The *first* : is also being encoded which is not the standard for URI on Windows
        // Here we transform it back to the standard way
        return value.toString().replace('%3A', ':');
    } else {
        return value.toString();
    }
}

function protocol2CodeConverter(value: string) {
    return vscode.Uri.parse(value);
}

export async function createLanguageServer(): Promise<LanguageClient> {
    const clientOptions: LanguageClientOptions = {
        // Register the server for Apex documents
        documentSelector: [{ language: 'apex', scheme: 'file' }],
        synchronize: {
            configurationSection: 'apex',
            fileEvents: [
            ]
        },
        uriConverters: {
            code2Protocol: code2ProtocolConverter,
            protocol2Code: protocol2CodeConverter
        }
    };

    const server = await createServer();
    const client = new LanguageClient(
        'apex',
        'Apex Intention Actions LSP',
        server,
        clientOptions
    );

    client.onTelemetry(data =>
        telemetryService.sendApexLSPLog(data.properties, data.measures)
    );

    return client;
}
