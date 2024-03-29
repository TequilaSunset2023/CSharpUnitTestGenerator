import { FunctionInfo } from './Entity/functionInfo';
import { ObjectInfo } from './Entity/objectInfo';
import { MethodGenerator } from './methodGenerator';

export class TestMethodGenerator extends MethodGenerator {
    protected mockedObjects: Map<string, string> = new Map<string, string>();

    constructor(
        indentLevel: number,
        protected testedClassConstructorParamTypes: string[],
        protected testedFunctionInfo: FunctionInfo,
        protected testedClassConstructorParamTypeMap: Map<string, string>,
        protected testCaseName: string,
        protected mockedFunctions: FunctionInfo[],
        outputCode: string
    ) {
        super(indentLevel, outputCode);
        const mockedObjectTypes = new Set(this.mockedFunctions.map(func => func.belongedClassName));
        for (const objType of mockedObjectTypes) {
            // TODO: may be a detection is needed here, detect if the first char of type is in upper case
            const interfaceType = this.testedClassConstructorParamTypeMap.get(objType);
            if (interfaceType) {
                this.mockedObjects.set(interfaceType, objType.charAt(0).toLowerCase() + objType.slice(1));
            }
        }
        this.testedClassConstructorParamTypeMap = testedClassConstructorParamTypeMap as Map<string, string>;
    }

    public GetUsedNamespaces(): string[] {
        const namespaces: string[] = [];
        for (const namespace of this.testedFunctionInfo.UsedNamespaces) {
            namespaces.push(`using ${namespace}`);
        }
        for (const functionInfo of this.mockedFunctions) {
            for (const namespace of functionInfo.UsedNamespaces) {
                namespaces.push(`using ${namespace}`);
            }
        }
        return Array.from(new Set(namespaces));
    }

    public async GetOutputCodeBlock(): Promise<string> {
        // method documention
        this.AppendLineIndented("/// <summary>");
        this.AppendLineIndented(`/// ${this.testedFunctionInfo.functionName}_${this.testCaseName}`);
        this.AppendLineIndented("/// <summary>");

        // method attributes
        for (const attribute of this.attributes) {
            this.AppendLineIndented(`[${attribute}]`);
        }

        // create function signature part
        this.AppendLineIndented(`public void Test${this.testedFunctionInfo.functionName}In${this.testCaseName}()`);
        this.AppendLineIndented("{");
        this.IndentedLevelUp();

        // Arrange in test method
        this.AppendLineIndented("// Arrange");
        this.mockedObjects.forEach((value: string, key: string) => {
            this.AppendLineIndented(`var ${value} = new Mock<${key}>();`);
        });

        // TODO: indent level may be not right here, will formatted on saving
        if (this.testedFunctionInfo.output.type !== "void") {
            this.AppendLineIndented(`var expected = ${this.ObjectToCSharpCode(this.testedFunctionInfo.output.value, this.testedFunctionInfo.output.type)};`);
        }
        for (const func of this.mockedFunctions) {
            const interfaceType = this.testedClassConstructorParamTypeMap.get(func.belongedClassName);
            if (interfaceType) {
                this.AppendLineIndented(`${this.mockedObjects.get(interfaceType)}.Setup(x => x.${func.functionName}(`);
                this.GenerateMockedFuncParasBlock(func.inputParams);
                this.outputCode += "))";
                this.AppendLineIndented(`.Returns(${this.ObjectToCSharpCode(func.output.value, func.output.type)});`);
            }
        }
        this.AppendLineIndented(`var instance = new ${this.testedFunctionInfo.belongedClassName}(`);
        this.IndentedLevelUp();
        const classConstructorLen = this.testedClassConstructorParamTypes.length;
        for (var index = 0; index < classConstructorLen; index++) {
            const paramType = this.testedClassConstructorParamTypes[index];
            const objName = this.mockedObjects.get(paramType);
            if (objName) {
                this.AppendLineIndented(`${objName}.Object${index !== classConstructorLen - 1 ? "," : ""}`);
            }
        }
        this.outputCode += ");";
        this.IndentedLevelDown();
        this.AppendLineIndented();

        // Act in test method
        this.AppendLineIndented("// Act");
        if (this.testedFunctionInfo.output.type === "void") {
            this.AppendLineIndented(`Action act = () => instance.${this.testedFunctionInfo.functionName}(`);
        } else {
            this.AppendLineIndented(`var actual = instance.${this.testedFunctionInfo.functionName}(`);
        }
        this.IndentedLevelUp();
        const funcInputParamsLen = this.testedFunctionInfo.inputParams.length;
        for (var index = 0; index < funcInputParamsLen; index++) {
            const param = this.testedFunctionInfo.inputParams[index];
            this.AppendLineIndented(`${this.ObjectToCSharpCode(param.value, param.type)}${index !== funcInputParamsLen - 1 ? "," : ""}`);
        }
        this.outputCode += ");";
        this.IndentedLevelDown();
        this.AppendLineIndented();

        // Assert in test method
        this.AppendLineIndented("// Assert");
        switch (this.testedFunctionInfo.output.type) {
            case "void":
                this.AppendLineIndented("act.Should().NotThrow();");
                break;
            case "int":
            case "bool":
            case "Guid":
                this.AppendLineIndented("actual.Should().Be(expected);");
                break;
            default:
                this.AppendLineIndented("actual.Should().BeEquivalentTo(expected);");
        }
        this.IndentedLevelDown();
        this.AppendLineIndented("}");

        return this.outputCode;
    }

    protected GenerateMockedFuncParasBlock(paras: ObjectInfo[]): void {
        this.IndentedLevelUp();
        const length = paras.length;
        for (var index = 0; index < length; index++) {
            const param = paras[index];
            this.AppendLineIndented(`${this.ObjectToCSharpCode(param.value, param.type)}${index !== length - 1 ? "," : ""}`);
        }
        this.IndentedLevelDown();
    }

    protected ObjectToCSharpCode(obj: object, objType: string): string {
        const JSON5 = require('json5');
        if (obj === undefined) {
            return `default(${objType})`;
        } else if (typeof obj === 'string' || obj instanceof String) {
            return `JsonConvert.DeserializeObject<${objType}[]>(@"['${obj.toString()}']")[0]`;
        } else if (obj === null) {
            return `null`;
        } else {
            return `JsonConvert.DeserializeObject<${objType}>(@"${JSON5.default.stringify(obj, { quote: "'" })}")`;
        }
    }
}