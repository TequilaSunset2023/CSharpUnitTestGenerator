import * as vscode from 'vscode';
import { extensions } from 'vscode';
import { Request } from "../omnisharp/protocol";
import * as serverUtils from '../omnisharp/utils';

export class CSharpProjectHelper {

    public static async getProjCsprojFilesPath(): Promise<string[] | undefined> {
        let csharpExt = extensions.getExtension('ms-dotnettools.csharp');
        let importedApi = csharpExt?.exports;
        let adviser = await importedApi?.getAdvisor();
        let server = (adviser as any)._server;
        try {
            const paths: string[] = [];
            const response = await serverUtils.requestWorkspaceInformation(server);
            if (response === undefined) {
                return undefined;
            }
            if (response.MsBuild && response.MsBuild.Projects) {
                for (const project of response.MsBuild.Projects) {
                    paths.push(project.Path);
                }
            } else if (response.DotNet && response.DotNet.Projects) {
                for (const project of response.DotNet.Projects) {
                    paths.push(project.Path);
                }
            } else {
                return undefined;
            }
            return paths;
        }
        catch (error) {
            return undefined;
        }
    }
    
    public static async getSourceProjCsprojFile(): Promise<string | undefined> {
        let csharpExt = extensions.getExtension('ms-dotnettools.csharp');
        let importedApi = csharpExt?.exports;
        let adviser = await importedApi?.getAdvisor();
        let server = (adviser as any)._server;
        const editor = vscode.window.activeTextEditor;
        if (editor === undefined) {
            return undefined;
        }
        let request: Request = {FileName: editor.document.fileName};
        try {
            const response = await serverUtils.requestProjectInformation(server, request);
            if (response === undefined) {
                return undefined;
            }
            const sourceProjCsprojFilePath = response.MsBuildProject.Path;
            const fileUri = vscode.Uri.file(sourceProjCsprojFilePath);
            const document = await vscode.workspace.openTextDocument(fileUri);
            const sourceProjCsprojFileContent = document.getText();
            return sourceProjCsprojFileContent;
        }
        catch (error) {
            return undefined;
        }
    }
}