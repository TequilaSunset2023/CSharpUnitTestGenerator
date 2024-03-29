import * as vscode from 'vscode';
import { CallbackManagerForLLMRun } from 'langchain/dist/callbacks';
import { LLM, BaseLLMParams } from 'langchain/llms/base';
import { sleep } from '../../Foundation/utils/sleep';

export class CopilotAsLLM extends LLM {

    outputFilePath: string;

    createNewOutputFileFlag = true;

    _llmType() {
        return "Github Copilot X";
    }

    constructor(
        outputFilePath: string,
        createNewOutputFileFlag?: boolean,
        fields?: BaseLLMParams
    ) {
        super(fields ?? {});
        this.outputFilePath = outputFilePath;
        this.createNewOutputFileFlag = createNewOutputFileFlag ?? this.createNewOutputFileFlag;
    };

    /** @ignore */
    public async _call(
        prompt: string,
        options: this["ParsedCallOptions"],
        runManager?: CallbackManagerForLLMRun
    ): Promise<string> {

        // Create the new file
        const fileUri = vscode.Uri.file(this.outputFilePath);

        if (this.createNewOutputFileFlag) {
            await vscode.workspace.fs.writeFile(fileUri, new Uint8Array());
        }

        // Open the new file in the editor
        const document = await vscode.workspace.openTextDocument(fileUri);
        await vscode.window.showTextDocument(document);

        // editor.action.selectAll
        await vscode.commands.executeCommand("editor.action.selectAll");
        await vscode.commands.executeCommand("vscode.editorChat.start",{message: prompt, autoSend: true 
		}).then(async () => {
			while (!document.isDirty) {
				await sleep(1000);
			}
			await vscode.commands.executeCommand('interactive.acceptChanges');
        }).then(async () => {
			await sleep(1000);
			await document.save();
            return sleep(1000);
		});
        const generatedCode = document.getText();

        void runManager?.handleLLMNewToken(
            generatedCode ?? ""
        );

        return generatedCode ?? "";
    }
}
