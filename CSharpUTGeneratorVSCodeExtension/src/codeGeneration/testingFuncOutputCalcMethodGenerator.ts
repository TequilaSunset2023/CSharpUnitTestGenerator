import { FunctionInfo } from './Entity/functionInfo';
import { ObjectInfo } from './Entity/objectInfo';
import { TestMethodGenerator } from './testMethodGenerator';

export class TestingFuncOutputCalcMethodGenerator extends TestMethodGenerator {

    constructor(
        indentLevel: number,
        testedClassConstructorParamTypes: string[],
        testedFunctionInfo: FunctionInfo,
        testedClassConstructorParamTypeMap: Map<string, string>,
        testCaseName: string,
        mockedFunctions: FunctionInfo[],
        outputCode: string,
        private resultFilePath: string
    ) {
        super(indentLevel, testedClassConstructorParamTypes, testedFunctionInfo, testedClassConstructorParamTypeMap, testCaseName, mockedFunctions, outputCode);
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

        if (this.testedFunctionInfo.output.type === "void") {
            this.GenerateFunctionBodyWithVoid();
        } else {
            this.GenerateFunctionBodyWithoutVoid();
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
            this.AppendLineIndented(`It.IsAny<${param.type}>()${index !== length - 1 ? "," : ""}`);
        }
        this.IndentedLevelDown();
    }

    private GenerateFunctionBodyWithoutVoid(): void {
        // Arrange in test method
        this.AppendLineIndented("// Arrange");
        this.mockedObjects.forEach((value: string, key: string) => {
            this.AppendLineIndented(`var ${value} = new Mock<${key}>();`);
        });

        // TODO: indent level may be not right here, will formatted on saving
        this.AppendLineIndented(`var expected = ${this.ObjectToCSharpCode(this.testedFunctionInfo.output.value, this.testedFunctionInfo.output.type)};`);
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
        this.AppendLineIndented("var jsonContent = String.Empty;");
        this.AppendLineIndented("try");
        this.AppendLineIndented("{");
        this.IndentedLevelUp();

        this.AppendLineIndented(`var actual = instance.${this.testedFunctionInfo.functionName}(`);
        this.IndentedLevelUp();
        const funcInputParamsLen = this.testedFunctionInfo.inputParams.length;
        for (var index = 0; index < funcInputParamsLen; index++) {
            const param = this.testedFunctionInfo.inputParams[index];
            this.AppendLineIndented(`${this.ObjectToCSharpCode(param.value, param.type)}${index !== funcInputParamsLen - 1 ? "," : ""}`);
        }
        this.outputCode += ");";
        this.IndentedLevelDown();
        this.AppendLineIndented();

        this.AppendLineIndented("jsonContent = JsonConvert.SerializeObject(actual);");
        this.IndentedLevelDown();
        this.AppendLineIndented("}");
        this.AppendLineIndented("catch");
        this.AppendLineIndented("{");
        this.IndentedLevelUp();
        this.AppendLineIndented("jsonContent = \"Exception\";");
        this.IndentedLevelDown();
        this.AppendLineIndented("}");

        // Save result to file
        this.GenerateOutputSavingCode();
    }

    private GenerateFunctionBodyWithVoid(): void {
        // Arrange in test method
        this.AppendLineIndented("// Arrange");
        this.mockedObjects.forEach((value: string, key: string) => {
            this.AppendLineIndented(`var ${value} = new Mock<${key}>();`);
        });

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
        this.AppendLineIndented("var jsonContent = String.Empty;");
        this.AppendLineIndented("try");
        this.AppendLineIndented("{");
        this.IndentedLevelUp();

        this.AppendLineIndented(`instance.${this.testedFunctionInfo.functionName}(`);
        this.IndentedLevelUp();
        const funcInputParamsLen = this.testedFunctionInfo.inputParams.length;
        for (var index = 0; index < funcInputParamsLen; index++) {
            const param = this.testedFunctionInfo.inputParams[index];
            this.AppendLineIndented(`${this.ObjectToCSharpCode(param.value, param.type)}${index !== funcInputParamsLen - 1 ? "," : ""}`);
        }
        this.outputCode += ");";
        this.IndentedLevelDown();
        this.AppendLineIndented();

        this.AppendLineIndented("jsonContent = \"NoException\";");
        this.IndentedLevelDown();
        this.AppendLineIndented("}");
        this.AppendLineIndented("catch");
        this.AppendLineIndented("{");
        this.IndentedLevelUp();
        this.AppendLineIndented("jsonContent = \"Exception\";");
        this.IndentedLevelDown();
        this.AppendLineIndented("}");

        // Save result to file
        this.GenerateOutputSavingCode();
    }

    private GenerateOutputSavingCode(): void {
        this.AppendLineIndented(`FileInfo fileInfo = new FileInfo(@"${this.resultFilePath}");`);
        this.AppendLineIndented("if (!fileInfo.Directory.Exists)");
        this.AppendLineIndented("{");
        this.IndentedLevelUp();
        this.AppendLineIndented("fileInfo.Directory.Create();");
        this.IndentedLevelDown();
        this.AppendLineIndented("}");
        this.AppendLineIndented(`using (StreamWriter file = File.CreateText(@"${this.resultFilePath}"))`);
        this.AppendLineIndented("{");
        this.IndentedLevelUp();
        this.AppendLineIndented("file.Write(jsonContent);");
        this.IndentedLevelDown();
        this.AppendLineIndented("}");
    }
}