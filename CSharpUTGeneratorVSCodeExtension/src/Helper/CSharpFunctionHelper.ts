import * as vscode from 'vscode';
import {extensions, Range } from 'vscode';
import { createRequest } from '../omnisharp/typeConversion';
import * as protocol from '../omnisharp/protocol';
import { V2 } from "../omnisharp/protocol";
import * as serverUtils from '../omnisharp/utils';
import { blockStructure } from "../omnisharp/utils";
import * as fs from 'fs';
import { FunctionCallNode } from '../Foundation/Structures/FunctionCallNode';

export abstract class CSharpFunctionHelper {

    public static async getMethodSig() : Promise<string | undefined>
    {
        let csharpExt = extensions.getExtension('ms-dotnettools.csharp');
        let importedApi = csharpExt?.exports;
        let adviser = await importedApi?.getAdvisor();
        let server = (adviser as any)._server;
        
        const position = vscode.window.activeTextEditor?.selection.active;
        const document = vscode.window.activeTextEditor?.document;
        const tokenSource = new vscode.CancellationTokenSource();
        const token = tokenSource.token;
    
        if (document !== undefined && position !== undefined) {
            let request = createRequest<protocol.QuickInfoRequest>(document, position);
            try {
                const response = await serverUtils.getQuickInfo(server, request, token);
                if (!response || !response.Markdown) {
                    return undefined;
                }
                
                let sigString = response.Markdown.split('\n')[1];
                if (sigString.startsWith('(extension) ')) {
                    sigString = sigString.substring(12);
                }
                
                let sigParts = sigString.split(',').map(x => x.replace(' ref ', ' ByRef '));
                sigString = sigParts.join(',');
                return sigString;
            }
            catch (error) {
                return undefined;
            }
        }
    }

    public static async getMethodNamespace() : Promise<string | undefined>
    {
        let csharpExt = extensions.getExtension('ms-dotnettools.csharp');
        let importedApi = csharpExt?.exports;
        let adviser = await importedApi?.getAdvisor();
        let server = (adviser as any)._server;
        
        const document = vscode.window.activeTextEditor?.document;
        const tokenSource = new vscode.CancellationTokenSource();
        const token = tokenSource.token;
    
        if (document !== undefined) {
            try {
                const response = await serverUtils.codeStructure(server, { FileName: document.fileName }, token);
                if (!response || !response.Elements || response.Elements.length === 0) {
                    return undefined;
                }
                
                for (var ele of response.Elements) {
                    if (ele.Kind === V2.SymbolKinds.Namespace) {
                        return ele.DisplayName;
                    }
                }
    
                return undefined;
            }
            catch (error) {
                return undefined;
            }
        }
    }

    public static findTheMethodCallRecordFromJson(jsonFilePath: string, codeStartLine: number, codeFileName: string) : FunctionCallNode | null
    {
        const json = fs.readFileSync(jsonFilePath, 'utf8');
        const jsonObj: FunctionCallNode[] = JSON.parse(json);
        return this.functionCallTreeDFSAndFindFirstMatch(jsonObj, (node) => Math.abs(node.CodeStartLine - codeStartLine - 1) <= 1 && node.CodeFileName.toUpperCase() === codeFileName.toUpperCase() ? node : null );
    }

    public static findTheMethodCallRecordFromJsonOld(jsonFilePath: string, methodSig: string, methodNamespace: string) : FunctionCallNode | null
    {
        const json = fs.readFileSync(jsonFilePath, 'utf8');
        const jsonObj: FunctionCallNode[] = JSON.parse(json);
        return this.functionCallTreeDFSAndFindFirstMatch(jsonObj, (node) => node.MethodSig === methodSig && node.NamespaceName === methodNamespace ? node : null );
    }

    public static getMethodSourceCodeFileName() : string
    {
        // should be absolute path here
        const document = vscode.window.activeTextEditor?.document;
        return document?.fileName ?? '';
    }

    public static async getMethodCodePositionRange() : Promise<Range | undefined>
    {
        let csharpExt = extensions.getExtension('ms-dotnettools.csharp');
        let importedApi = csharpExt?.exports;
        let adviser = await importedApi?.getAdvisor();
        let server = (adviser as any)._server;
        
        const position = vscode.window.activeTextEditor?.selection.active;
        const document = vscode.window.activeTextEditor?.document;
        const tokenSource = new vscode.CancellationTokenSource();
        const token = tokenSource.token;
    
        if (document !== undefined && position !== undefined) {
            let request: V2.BlockStructureRequest = {
                FileName: document.fileName,
            };
    
            try {
                let response = await blockStructure(server, request, token);
                for (let member of response.Spans) {
                    if (member.Range.Start.Line === position.line) {
                        return new Range(member.Range.Start.Line, 0, member.Range.End.Line + 1, 0);
                    }
                }
                return undefined;
            }
            catch (error) {
                return undefined;
            }
        }
    }

    public static getTextInRange(funcRange : Range) : string {
        const editor = vscode.window.activeTextEditor;
        if (editor === undefined) {
            return '';
        }
    
        return editor.document.getText(funcRange);
    }

    private static functionCallTreeDFSAndFindFirstMatch(nodes: FunctionCallNode[], func: (node: FunctionCallNode) => FunctionCallNode | null ) : FunctionCallNode | null
    {
        for (const node of nodes)
        {
            let result = func(node);
            if (result !== null) {
                return result;
            }
            result = this.functionCallTreeDFSAndFindFirstMatch(node.Children, func);
            if (result !== null) {
                return result;
            }
        }
        return null;
    }
}