// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import { extensions, TextDocument, Position, MarkdownString, Range, FoldingRange, FoldingRangeKind } from 'vscode';
import { blockStructure } from "./omnisharp/utils";
import { V2, Request } from "./omnisharp/protocol";
import { SequentialChain } from 'langchain/chains';
import { countTokens } from './Foundation/utils/tokenCount';
import { CSharpFunctionHelper } from './Helper/CSharpFunctionHelper';
import { LangchainHelper } from './Helper/LangchainHelper';
import { CSharpProjectHelper } from './Helper/CSharpProjectHelper';
import { TestMethodGenerator } from './codeGeneration/testMethodGenerator';
import { FunctionInfo } from './codeGeneration/Entity/functionInfo';
import { ObjectInfo } from './codeGeneration/Entity/objectInfo';
import { TestFileGenerator } from './codeGeneration/testFileGenerator';
import { TestFrameworks } from './codeGeneration/Entity/testFrameworks';
import { MockFrameworks } from './codeGeneration/Entity/mockFrameworks';
import { MockFramework } from './codeGeneration/Entity/mockFramework';
import { TestFramework } from './codeGeneration/Entity/testFramework';
import { CsprojFileGenerator } from './codeGeneration/csprojFileGenerator';
import { BoundaryCaseTestMethodGenerator } from './codeGeneration/boundaryCaseTestMethodGenerator';
import { TestingFuncOutputCalcMethodGenerator } from './codeGeneration/testingFuncOutputCalcMethodGenerator';
import { execShell } from './Foundation/utils/execShell';
import { FunctionCallNode } from './Foundation/Structures/FunctionCallNode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('CSharpUTGenerator.startgenerate', async (args) => {
		const configuration = vscode.workspace.getConfiguration();
		const apiType: string | undefined = configuration.get('openaiapi.type');
		let apiEndpoint: string | undefined = configuration.get('openaiapi.endpoint');
		const apiVersion: string | undefined = configuration.get('openaiapi.version');
		const apiKey: string | undefined = configuration.get('openaiapi.key');
		const deploymentName: string | undefined = configuration.get('openaiapi.deployment_name');
		const modelName: string | undefined = configuration.get('openaiapi.model_name');
		if (apiType === '' || apiType === undefined || apiType === null) {
			vscode.window.showErrorMessage(`please check if openaiapi.type is empty in settings -> Extensions -> CSharpUTGenOpenAPI tab.`);
			return;
		}
		if (apiEndpoint === '' || apiEndpoint === undefined || apiEndpoint === null) {
			vscode.window.showErrorMessage(`please check if openaiapi.endpointis empty in settings -> Extensions -> CSharpUTGenOpenAPI tab.`);
			return;
		} else {
			apiEndpoint = apiEndpoint.replace(/\/$/, "") + "/openai/deployments";
		}
		if (apiVersion === '' || apiVersion === undefined || apiVersion === null) {
			vscode.window.showErrorMessage(`please check if openaiapi.version is empty in settings -> Extensions -> CSharpUTGenOpenAPI tab.`);
			return;
		}
		if (apiKey === '' || apiKey === undefined || apiKey === null) {
			vscode.window.showErrorMessage(`please check if openaiapi.key is empty in settings -> Extensions -> CSharpUTGenOpenAPI tab.`);
			return;
		}
		if (deploymentName === '' || deploymentName === undefined || deploymentName === null) {
			vscode.window.showErrorMessage(`please check if openaiapi.deployment_name is empty in settings -> Extensions -> CSharpUTGenOpenAPI tab.`);
			return;
		}
		if (modelName === '' || modelName === undefined || modelName === null) {
			vscode.window.showErrorMessage(`please check if openaiapi.deployment_name is empty in settings -> Extensions -> CSharpUTGenOpenAPI tab.`);
			return;
		}

		let utFilePath = await vscode.window.showInputBox({
			title: 'C# UT Generator',
			placeHolder: 'Existed target UT file path and TestClassName',
			prompt: `Type in this format:  \'file_absolute_path?TestClassName\'  to generate code into an existed UT file.
			Or press 'Enter' directly to generate code into a new file.
			To generate code into an existed file, here is an example: \'C:\\AClassTest.cs?AClassTest\'
			`}
		);
		let testClassName = '';
		if (utFilePath === undefined) {
			return;
		} else if (utFilePath === '') {
			utFilePath = 'in a new file';
		} else {
			var inputs = utFilePath.split('?');
			utFilePath = inputs[0];
			testClassName = inputs.length > 1 ? inputs[1] : '';
		}

		const methodSig = await CSharpFunctionHelper.getMethodSig();
		if (methodSig === undefined) {
			vscode.window.showErrorMessage(`get method signature failed.`);
			return;
		}

		const methodNamespace = await CSharpFunctionHelper.getMethodNamespace();
		if (methodNamespace === undefined) {
			vscode.window.showErrorMessage(`get method namespace failed.`);
			return;
		}

		const workspaceRootPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath ?? '';
		const copilotPlaygroundPath = `${workspaceRootPath}\\.CSharpUTGen`;
		const outputCalcProjPath = `${workspaceRootPath}\\.CSharpUTGenOutputCalcProj`;

		const workspacePath = await vscode.workspace.findFiles('**/funcIORec.json', `**/.CSharpUTGen/**`);
		if (workspacePath.length === 0) {
			vscode.window.showErrorMessage(`Cannot find the funcIORec.json file in vscode workspace, please make sure you have recorded the C# function call using our C# utils.`);
			return;
		} else if (workspacePath.length > 1) {
			vscode.window.showErrorMessage(`Found more than one funcIORec.json file in vscode workspace, please navigate to the C# project which need to generate UT code this time or just delete other funcIORec.json file.`);
			return;
		}

		const funcRange = await CSharpFunctionHelper.getMethodCodePositionRange();
		if (funcRange === undefined) {
			vscode.window.showErrorMessage(`Cannot get the function code range for function "${methodSig}" please make sure C# extension or omnisharp server is running.`);
			return;
		}

		const fileName = CSharpFunctionHelper.getMethodSourceCodeFileName();
		if (fileName === "") {
			vscode.window.showErrorMessage(`Cannot get the fileName for function "${methodSig}".`);
			return;
		}

		const methodCallRecord = CSharpFunctionHelper.findTheMethodCallRecordFromJson(workspacePath[0].fsPath, funcRange.start.line, fileName);
		if (methodCallRecord === null) {
			vscode.window.showErrorMessage(`Cannot find the function call record for function "${methodSig}" in funcIORec.json file, please make sure you have recorded the C# function call using our C# utils.`);
			return;
		}

		const funcImplString = CSharpFunctionHelper.getTextInRange(funcRange);
		const childrenObj = methodCallRecord.Children;
		let childrenFormatted: MockedFuncInfo[] = [];
		if (childrenObj !== undefined && childrenObj.length > 0) {
			childrenFormatted = childrenObj.map((child: FunctionCallNode) => {
				return { MethodSignature: child.MethodSig, Input: child.Input, Output: child.Output }
			});
		}

		const functionInputParams: ObjectInfo[] = [];
		const inputCount = methodCallRecord.Input.length;
		for (var index = 0; index < inputCount; index++) {
			functionInputParams.push(new ObjectInfo(methodCallRecord.InputTypes[index], methodCallRecord.Input[index]))
		}
		const output = new ObjectInfo(methodCallRecord.OutputType, methodCallRecord.Output);

		const testedFunctionInfo: FunctionInfo = new FunctionInfo(
			methodCallRecord.MethodName,
			methodCallRecord.MethodSig,
			methodCallRecord.ClassName,
			functionInputParams, output,
			methodCallRecord.UsedNamespaces
		);
		const mockedFunctions: FunctionInfo[] = [];
		for (const childFunc of methodCallRecord.Children) {
			const childFunctionInputParams: ObjectInfo[] = [];
			const childInputCount = childFunc.Input.length;
			for (var index = 0; index < childInputCount; index++) {
				childFunctionInputParams.push(new ObjectInfo(childFunc.InputTypes[index], childFunc.Input[index]))
			}
			const childOutput = new ObjectInfo(childFunc.OutputType, childFunc.Output);
			mockedFunctions.push(new FunctionInfo(
				childFunc.MethodName,
				childFunc.MethodSig,
				childFunc.ClassName,
				childFunctionInputParams,
				childOutput,
				childFunc.UsedNamespaces
			));
		}

		const projectsInSln = await CSharpProjectHelper.getProjCsprojFilesPath();
		const csprojFile = await CSharpProjectHelper.getSourceProjCsprojFile();
		if (csprojFile === undefined || projectsInSln === undefined) {
			vscode.window.showErrorMessage(`Cannot find valid .csproj file for this project`);
			return;
		}

		const testMethodGenerator = new TestMethodGenerator(0, methodCallRecord.ConstructorParamTypes,
			testedFunctionInfo, methodCallRecord.TypesMap === null ? new Map() : new Map(Object.entries(methodCallRecord.TypesMap)), "NormalCase", mockedFunctions, "");

		const testFramework = TestFrameworks.Get(TestFrameworks.VisualStudioName);
		const mockFramework = MockFrameworks.Get(MockFrameworks.MoqName);

		const codeOutputPath = `${copilotPlaygroundPath}\\${methodCallRecord.ClassName}.test.cs`;
		const projPath = `${copilotPlaygroundPath}\\unitTestDemo.csproj`;
		const boundaryCaseTestMethodGenerators: BoundaryCaseTestMethodGenerator[] = [];

		if (utFilePath === 'in a new file') {
			// Calculate and save input of tested function in the boundary cases
			const boundaryCasesListChain = LangchainHelper.getBoundaryCasesListChain(modelName, apiVersion, apiKey, apiEndpoint, deploymentName);
			const boundaryCasesFunctionInputListChain = LangchainHelper.getBoundaryCasesFunctionInputListChain(modelName, apiVersion, apiKey, apiEndpoint, deploymentName);
			const UTGenChain = new SequentialChain({
				chains: [boundaryCasesListChain, boundaryCasesFunctionInputListChain],
				inputVariables: ["question", "functionSignature", "functionInputInNormalCase"],
				outputVariables: ["boundaryCasesList", "boundaryCasesFunctionInputList"]
			});
			const boundaryCasesListQuestion = `please list minimum boundary test cases(not code just cases) for the following method below to fully achieve the goal:
			Goal:
			\`\`\`
			1. Cover all code if/else/switch branches 
			2. Generate as less as better boundary test cases to achieve goal 1.
			...
			\`\`\`

			Some rules about your output generation:
			\`\`\`
			1. Mark the case as '[exception]' at the start of case if there should be an exception thrown in the case, mark as '[noException]' if not.
			2. Then mark [mockFuncThrowException] if the case is about how mocked function throw exception, mark it as [mockFuncUnRelated] if the case is not related with any mocked function, drop the case if the case is related with a mocked function and the mock function don't throw any exception.
			3. Finally mark test method name before case description, each test method name should be unique.
			4. Do NOT check null value for any parameter in the case, just check the value is valid or not.
			...
			\`\`\`

			According the rules, your output format should be like this:
			\`\`\`
			// boundary test cases:
			// [noException] [mockFuncUnRelated] [Description in short as testMethodName for case1] 1. boundary test case description.
			// [exception] [mockFuncUnRelated] [Description in short as testMethodName for case2] 2. boundary test case description.
			// [exception] [mockFuncUnRelated] [Description in short as testMethodName for case3] 3. boundary test case description.
			// [exception] [mockFuncThrowException] [Description in short as testMethodName for case4] 4. boundary test case description.
			...
			\`\`\`

			Output example:
			\`\`\`
			// boundary test cases:
			// [exception] [mockFuncUnRelated] [FirstParamInvalid] 1. first parameter is invalid.
			// [noException] [mockFuncUnRelated] [SecondParamIsValue1] 2. second parameter is value1.
			// [noException] [mockFuncUnRelated] [TestInBranch] 3. this case hit another code branch.
			// [exception] [mockFuncThrowException] [function1Exception] 4. mocked function function1 throw exception.
			...
			\`\`\`

			mocked function signatures:
			\`\`\`
			${JSON.stringify(mockedFunctions.map(func => func.functionSignature))}
			\`\`\`

			Function Implementation:
			\`\`\`
			${funcImplString}
			\`\`\`
			`;
			const functionInputInNormalCase = JSON.stringify(methodCallRecord.Input);
			let result = null;
			try {
				result = await UTGenChain.call({
					"question": boundaryCasesListQuestion,
					"functionSignature": methodSig,
					"functionInputInNormalCase": functionInputInNormalCase,
				});
			} catch (error) {
				vscode.window.showErrorMessage(`LLM call failed, error: ${error}.`);
				return;
			}

			// Calculate mocked function input in all boundary cases and save
			const boundaryCasesList: string[] = result.boundaryCasesList.split("\n").slice(1, -1);
			let boundaryCasesFunctionInputList: any[] = [];
			try {
				const JSON5 = require('json5');
				boundaryCasesFunctionInputList = JSON5.default.parse(result.boundaryCasesFunctionInputList);
			} catch (error) {
				vscode.window.showErrorMessage(`LLM generate wrong input data, error: ${error}.`);
				return;
			}
			const outputNeedCalcCaseIndexs: number[] = [];
			for (const index in boundaryCasesList) {
				const boundaryCase = boundaryCasesList[index];
				const flagArray = boundaryCase.match(/(?<=\[)(\S+)(?=\])/g);
				if (flagArray === null || flagArray.length < 3) {
					vscode.window.showErrorMessage(`LLM generate wrong input data, error: invalid case ${boundaryCase}.`);
					return;
				}
				if (flagArray[0] === "noException") {
					outputNeedCalcCaseIndexs.push(Number(index));
				}
			}

			console.log("LLM generation done.");
			await CalcTestingFuncOutput(boundaryCasesFunctionInputList, outputNeedCalcCaseIndexs, outputCalcProjPath,
				methodCallRecord, mockedFunctions, testedFunctionInfo, testFramework, mockFramework,
				csprojFile, projectsInSln, workspaceRootPath);
			const caseOutputDict = await GetTestingFuncOutput(outputCalcProjPath, outputNeedCalcCaseIndexs);
			
			console.log("Output Calc done.");
			const length = Math.min(boundaryCasesList.length, boundaryCasesFunctionInputList.length);
			for (var index = 0; index < length; index++) {
				const testCaseName = index.toString();
				const functionInput = boundaryCasesFunctionInputList[index];
				const testedFuncInfoInBoundaryCase: FunctionInfo = JSON.parse(JSON.stringify(testedFunctionInfo));
				for (const property in testedFuncInfoInBoundaryCase.inputParams) {
					testedFuncInfoInBoundaryCase.inputParams[property].value = functionInput[property];
				}
				const newOutput = caseOutputDict.get(index);
				let caseDescription = boundaryCasesList[index];
				if (newOutput !== undefined) {
					if (newOutput === null) {
						caseDescription = caseDescription.replace(/^\/\/ \[noException\]/, "// [exception]");
					} else {
						testedFuncInfoInBoundaryCase.output.value = newOutput;
					}
				}
				const boundaryCaseTestMethodGenerator = new BoundaryCaseTestMethodGenerator(0, methodCallRecord.ConstructorParamTypes,
					testedFuncInfoInBoundaryCase,  methodCallRecord.TypesMap === null ? new Map() : new Map(Object.entries(methodCallRecord.TypesMap)), testCaseName, mockedFunctions, "", caseDescription);
				boundaryCaseTestMethodGenerators.push(boundaryCaseTestMethodGenerator);
			}
		} else {
			const funcEndPositionInUTFile = await getTextClassImplLastFuncEndPosition(testClassName, utFilePath);
			if (funcEndPositionInUTFile === undefined) {
				vscode.window.showErrorMessage(`Cannot find TestClass ${testClassName} Implementation in ${utFilePath}.`);
				return;
			}

			const normalCaseCodeGenRequest = `Please help to generate unit test method for following method, new unit test class is not needed, only methods is allowed.
			Using following input parameters and return value and functions need to be mocked below
			input parameters:
			${JSON.stringify(methodCallRecord.Input, null, 4).slice(1, -1)}
			return value:
			${JSON.stringify(methodCallRecord.Output, null, 4)}
			${childrenFormatted.length === 0 ? '' :
					`functions need to be mocked:'
			${JSON.stringify(childrenFormatted, null, 4).slice(1, -1)}
			`}
			implement of the function need to generate unit test code:
			${funcImplString}
			edge cases:
			1. check cases for each parameters that the parameter is null, but other parameters are valid
			2. mocked function return null`;

			const inputTokenLength = countTokens(normalCaseCodeGenRequest);
			if (inputTokenLength > maxCopilotInputTokenLength) {
				vscode.window.showErrorMessage(`The stored self testing output of function ${methodSig} is too long, total token length is ${inputTokenLength} which is higher than maxCopilotInputTokenLength : ${maxCopilotInputTokenLength}.`);
				return;
			}
			const boundaryCasesListQuestion = `please list all boundary test cases(not code just cases) for the following method:
			${funcImplString}
			`;
			const boundaryCasesListChain = LangchainHelper.getBoundaryCasesListChain(modelName, apiVersion, apiKey, apiEndpoint, deploymentName);


			const boundaryCasesCodeGenChain = LangchainHelper.getBoundaryCasesCodeGenChain(codeOutputPath);

			const UTGenChain = new SequentialChain({
				chains: [boundaryCasesListChain, boundaryCasesCodeGenChain],
				inputVariables: ["question", "request"],
				outputVariables: []
			});

			const unitTestMethod = await UTGenChain.call({
				"request": normalCaseCodeGenRequest,
				"question": boundaryCasesListQuestion,
			});

			writeInputStringToEndOfFunc(unitTestMethod.boundaryCasesCode, funcEndPositionInUTFile, utFilePath);
			// Need to format UT method.
		}
		const testFileGenerator = new TestFileGenerator(testFramework, mockFramework, methodCallRecord.NamespaceName, methodCallRecord.ClassName, [testMethodGenerator, ...boundaryCaseTestMethodGenerators]);
		const code = await testFileGenerator.GetOutputCodeBlock();

		const csprojFileGenerator = new CsprojFileGenerator(projPath, csprojFile, projectsInSln);
		const csprojFileContent = await csprojFileGenerator.GetOutputCodeBlock();

		// Create the new test class file
		const fileUri = vscode.Uri.file(codeOutputPath);
		try {
			if (!fs.existsSync(copilotPlaygroundPath)) {
				await vscode.workspace.fs.createDirectory(vscode.Uri.file(copilotPlaygroundPath));
			}
		} finally {
			await vscode.workspace.fs.writeFile(fileUri, new TextEncoder().encode(code));
		}

		// Create the csproj file
		const projfileUri = vscode.Uri.file(projPath);
		await vscode.workspace.fs.writeFile(projfileUri, new TextEncoder().encode(csprojFileContent));

		// we can use this to test the project, "Pass:    1" is expected in the last row of the response
		// const response = await execShell(`dotnet test ${projPath}`, workspaceRootPath);

		vscode.window.showInformationMessage(`Unit test code generated successfully, please check the file: ${codeOutputPath}`);
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }

const maxCopilotInputTokenLength = 8000;

async function getTextClassImplLastFuncEndPosition(className: string, utFilePath: string): Promise<Position | undefined> {
	let csharpExt = extensions.getExtension('ms-dotnettools.csharp');
	let importedApi = csharpExt?.exports;
	let adviser = await importedApi?.getAdvisor();
	let server = (adviser as any)._server;
	let utFileUri = vscode.Uri.file(utFilePath);
	const editor = await vscode.window.showTextDocument(utFileUri);
	if (editor === undefined) {
		vscode.window.showErrorMessage(`vscode editor went wrong, UT generation failed.`);
		return;
	}

	const document = editor.document;
	const tokenSource = new vscode.CancellationTokenSource();
	const token = tokenSource.token;
	const regexp = new RegExp(`^${className}[ \s]|[ \s]${className}[ \r\n\s]|[ \s]${className}$`);
	let request: V2.BlockStructureRequest = {
		FileName: document.fileName,
	};
	try {
		let response = await blockStructure(server, request, token);
		if (response === undefined) {
			return undefined;
		}

		let classImplStartPosition = null;
		let classImplEndPosition = null;
		for (let member of response.Spans) {
			const range = new Range(member.Range.Start.Line, 0, member.Range.Start.Line, member.Range.Start.Column);
			const text = editor.document.getText(range);
			if (regexp.test(editor.document.getText(range)) && member.Kind !== "Comment" && member.Kind !== "Imports") {
				const text = editor.document.getText(range);
				classImplStartPosition = new Position(member.Range.Start.Line, member.Range.Start.Column);
				classImplEndPosition = new Position(member.Range.End.Line, member.Range.End.Column);
				break;
			}
		}
		if (classImplEndPosition === null || classImplStartPosition === null) {
			return undefined;
		}

		let lastCodeBlockEndPosition = classImplStartPosition;
		for (let member of response.Spans) {
			let startPosition = new Position(member.Range.Start.Line, member.Range.Start.Column);
			let endPosition = new Position(member.Range.End.Line, member.Range.End.Column);
			if (startPosition.isAfter(classImplStartPosition) && endPosition.isBefore(classImplEndPosition)) {
				if (endPosition.isAfter(lastCodeBlockEndPosition)) {
					lastCodeBlockEndPosition = endPosition;
				}
			}
		}
		return new Position(lastCodeBlockEndPosition.line, lastCodeBlockEndPosition.character + 1);
	}
	catch (error) {
		return undefined;
	}
}

async function writeInputStringToEndOfFunc(inputString: string, funcRangeEndPosition: Position, utFilePath: string): Promise<void> {
	let utFileUri = vscode.Uri.file(utFilePath);
	let editor = await vscode.window.showTextDocument(utFileUri);
	if (editor === undefined) {
		vscode.window.showErrorMessage(`vscode editor went wrong, UT generation failed.`);
		return;
	}

	editor?.edit((editBuilder) => {
		editBuilder.insert(funcRangeEndPosition, '\n\n');
		editBuilder.insert(funcRangeEndPosition, inputString);
	});
}

async function CalcTestingFuncOutput(boundaryCasesFunctionInputList:string[], outputNeedCalcCaseIndexs: number[], 
	outputCalcProjPath: string, methodCallRecord: FunctionCallNode, mockedFunctions: FunctionInfo[],
	testedFunctionInfo: FunctionInfo, testFramework: TestFramework, mockFramework: MockFramework,
	sourceCsprojFile: string, projectsInSln: string[], workspaceRootPath: string): Promise<void> {
	console.log("start CalcTestingFuncOutput");
	const codeOutputPath = `${outputCalcProjPath}\\${methodCallRecord.ClassName}.test.cs`;
	const csprojFilePath = `${outputCalcProjPath}\\unitTestDemo.csproj`;
	const testingFuncOutputCalcMethodGenerators: TestingFuncOutputCalcMethodGenerator[] = [];
	
	console.log("start CalcTestingFunc Code Gen");
	try {
		for (const index of outputNeedCalcCaseIndexs) {
			console.log(`Method ${index} start`);
			const outputJsonFilePath = `${outputCalcProjPath}\\outputJsons\\${index}.json`;
			const functionInput: any = boundaryCasesFunctionInputList[index];
			const testCaseName = index.toString();
			const testedFuncInfoInThisCase = JSON.parse(JSON.stringify(testedFunctionInfo));
			for (const property in testedFuncInfoInThisCase.inputParams) {
				testedFuncInfoInThisCase.inputParams[property].value = functionInput[property];
			}
			const testingFuncOutputCalcMethodGenerator: TestingFuncOutputCalcMethodGenerator = new TestingFuncOutputCalcMethodGenerator(0, methodCallRecord.ConstructorParamTypes,
				testedFuncInfoInThisCase,  methodCallRecord.TypesMap === null ? new Map() : new Map(Object.entries(methodCallRecord.TypesMap)), testCaseName, mockedFunctions, "", outputJsonFilePath);
			testingFuncOutputCalcMethodGenerators.push(testingFuncOutputCalcMethodGenerator);
			console.log(`Method ${index} end`);
		}
	} catch (e) {
		console.log(e);
	}
	console.log("TestFileGenerator Constructor start");
	const testFileGenerator = new TestFileGenerator(testFramework, mockFramework, methodCallRecord.NamespaceName, methodCallRecord.ClassName, testingFuncOutputCalcMethodGenerators);
	console.log("Calc project GetOutputCodeBlock start");
	const code = await testFileGenerator.GetOutputCodeBlock();

	const csprojFileGenerator = new CsprojFileGenerator(csprojFilePath, sourceCsprojFile, projectsInSln);
	const csprojFileContent = await csprojFileGenerator.GetOutputCodeBlock();

	// Create the new test class file
	console.log("start to generate output calc project");
	const fileUri = vscode.Uri.file(codeOutputPath);
	try {
		if (!fs.existsSync(outputCalcProjPath)) {
			await vscode.workspace.fs.createDirectory(vscode.Uri.file(outputCalcProjPath));
		}
	} finally {
		await vscode.workspace.fs.writeFile(fileUri, new TextEncoder().encode(code));
	}

	// Create the csproj file
	const projfileUri = vscode.Uri.file(csprojFilePath);
	await vscode.workspace.fs.writeFile(projfileUri, new TextEncoder().encode(csprojFileContent));

	try {
		console.log("start output calc");
		const response = await execShell(`dotnet test ${csprojFilePath}`, workspaceRootPath);
		console.log(response);
	} finally {
		return;
	}
}

async function GetTestingFuncOutput(outputCalcProjPath: string, outputNeedCalcCaseIndexs: number[]): Promise<Map<number, object | null>> {
	const caseOutputDict: Map<number, object | null> = new Map();
	for (const index of outputNeedCalcCaseIndexs) {
		const outputJsonFilePath = `${outputCalcProjPath}\\outputJsons\\${index}.json`;
		const outputJson = new TextDecoder().decode(await vscode.workspace.fs.readFile(vscode.Uri.file(outputJsonFilePath)));
		if (outputJson.startsWith("Exception")) {
			caseOutputDict.set(index, null);
		} else if ( outputJson.startsWith("NoException")) {
			caseOutputDict.set(index, new Object());
		} else {
			const output = JSON.parse(outputJson);
			caseOutputDict.set(index, output);
		}
	}
	return caseOutputDict;
}
