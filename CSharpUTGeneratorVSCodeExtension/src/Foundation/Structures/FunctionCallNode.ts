import { Range } from 'vscode';

export interface FunctionCallNode {
	DateTime: Date;
	ModuleName: string;
	NamespaceName: string;
	ClassName: string;
	ConstructorParamTypes: string[];
	MethodName: string;
	MethodSig: string;
	Children: FunctionCallNode[];
	Input: object[];
	InputTypes: string[];
	Output: object;
	OutputType: string;
	UsedNamespaces: string[];
	StackFrame: string;
	InstanceType: object;
	TypesMap: object;
	CodeFileName: string;
	CodeStartLine: number;
	CodeStartCharacter: number;
}