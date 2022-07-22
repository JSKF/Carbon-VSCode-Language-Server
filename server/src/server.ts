/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult
} from 'vscode-languageserver/node';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
	const capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			// Tell the client that this server supports code completion.
			completionProvider: {
				resolveProvider: true
			}
		}
	};
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}
	return result;
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

// The example settings
interface ExampleSettings {
	maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = <ExampleSettings>(
			(change.settings.languageServerExample || defaultSettings)
		);
	}

	// Revalidate all open text documents
	documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'languageServerExample'
		});
		documentSettings.set(resource, result);
	}
	return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
	validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	// In this simple example we get the settings for every validate run.
	const settings = await getDocumentSettings(textDocument.uri);

	// The validator creates diagnostics for all uppercase words length 2 and more
	const text = textDocument.getText();
	const pattern = /\b[A-Z]{2,}\b/g;
	let m: RegExpExecArray | null;

	let problems = 0;
	const diagnostics: Diagnostic[] = [];
	/*while ((m = pattern.exec(text)) && problems < settings.maxNumberOfProblems) {
		problems++;
		const diagnostic: Diagnostic = {
			severity: DiagnosticSeverity.Warning,
			range: {
				start: textDocument.positionAt(m.index),
				end: textDocument.positionAt(m.index + m[0].length)
			},
			message: `${m[0]} is all uppercase.`,
			source: 'ex'
		};
		if (hasDiagnosticRelatedInformationCapability) {
			diagnostic.relatedInformation = [
				{
					location: {
						uri: textDocument.uri,
						range: Object.assign({}, diagnostic.range)
					},
					message: 'Spelling matters'
				},
				{
					location: {
						uri: textDocument.uri,
						range: Object.assign({}, diagnostic.range)
					},
					message: 'Particularly for names'
				}
			];
		}
		diagnostics.push(diagnostic);
	} */

	// Send the computed diagnostics to VSCode.
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
	(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
		// The pass parameter contains the position of the text document in
		// which code complete got requested. For the example we ignore this
		// info and always provide the same completion items.
		return [

			// VARIABLES
			{
				label: 'var',
				kind: CompletionItemKind.Text,
				data: 3
			},
			{
				label: 'f16',
				kind: CompletionItemKind.Text,
				data: 2
			},
			{
				label: 'f32',
				kind: CompletionItemKind.Text,
				data: 2
			},
			{
				label: 'f64',
				kind: CompletionItemKind.Text,
				data: 2
			},
			{
				label: 'f128',
				kind: CompletionItemKind.Text,
				data: 2
			},
			{
				label: 'BFloat16',
				kind: CompletionItemKind.Text,
				data: 2
			},
			{
				label: 'String',
				kind: CompletionItemKind.Text,
				data: 4
			},
			{
				label: 'StringView',
				kind: CompletionItemKind.Text,
				data: 4
			},
			{
				label: 'i8',
				kind: CompletionItemKind.Text,
				data: 1
			},
			{
				label: 'i16',
				kind: CompletionItemKind.Text,
				data: 1
			},
			{
				label: 'i32',
				kind: CompletionItemKind.Text,
				data: 1
			},
			{
				label: 'i64',
				kind: CompletionItemKind.Text,
				data: 1
			},
			{
				label: 'i128',
				kind: CompletionItemKind.Text,
				data: 1
			},
			{
				label: 'i256',
				kind: CompletionItemKind.Text,
				data: 1
			},
			{
				label: 'u8',
				kind: CompletionItemKind.Text,
				data: 1
			},
			{
				label: 'u16',
				kind: CompletionItemKind.Text,
				data: 1
			},
			{
				label: 'u32',
				kind: CompletionItemKind.Text,
				data: 1
			},
			{
				label: 'u64',
				kind: CompletionItemKind.Text,
				data: 1
			},
			{
				label: 'u128',
				kind: CompletionItemKind.Text,
				data: 1
			},
			{
				label: 'u256',
				kind: CompletionItemKind.Text,
				data: 1
			},
			// FUNCTIONS

			{
				label: 'if',
				kind: CompletionItemKind.Text,
				data: 6
			},
			{
				label: 'while',
				kind: CompletionItemKind.Text,
				data: 6
			},
			{
				label: 'then',
				kind: CompletionItemKind.Text,
				data: 6
			},
			{
				label: 'else',
				kind: CompletionItemKind.Text,
				data: 6
			},
			{
				label: 'Carbon',
				kind: CompletionItemKind.Text,
				data: 6
			},
			
			{
				label: 'Swap',
				kind: CompletionItemKind.Text,
				data: 6
			},
			{
				label: 'Size',
				kind: CompletionItemKind.Text,
				data: 6
			},
			{
				label: 'fn',
				kind: CompletionItemKind.Text,
				data: 6
			},
			{
				label: 'Slice',
				kind: CompletionItemKind.Text,
				data: 6
			},
			{
				label: 'in',
				kind: CompletionItemKind.Text,
				data: 6
			}
		];
	}
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
		if (item.data === 1) { // i numbers
			item.detail = 'Carbon Signed Integer Type';
			item.documentation = 'Contains a integer value. You can set the number of bits by using i16, i32, i64, i128, or i256.';
		} else if (item.data === 2) { // f numbers
			item.detail = 'Carbon Floating Point Type';
			item.documentation = 'This is a floating point';
		} 
		else if (item.data === 3) {
			item.detail = 'Carbon Var';
			item.documentation = 'A var declares a variable.';
		}
		else if (item.data === 4) {
			item.detail = 'Carbon String';
			item.documentation = 'A String is a byte sequence treated as containing UTF-8 encoded text. A StringView is a read only variation of a String.';
		}
		else if (item.data === 5) {
			item.detail = 'Carbon Floating Point Type';
			item.documentation = 'Contains a floating point value that rounds-to-nearest. You can set the number of bits by using f16, f32, f64, and f128. BFloat16 is also supported.';
		}else if (item.data === 6) {
			item.detail = 'Carbon Function';
			item.documentation = 'Function - Description to be added.';
		}
		return item;
	}
);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
