import { FunctionInfo } from './Entity/functionInfo';
import { ObjectInfo } from './Entity/objectInfo';
import { TestMethodGenerator } from './testMethodGenerator';

export class BoundaryCaseTestMethodGenerator extends TestMethodGenerator {
    private isExceptionCase: boolean = false;
    private isMockFuncThrowException: boolean = false;

    constructor(
        indentLevel: number,
        testedClassConstructorParamTypes: string[],
        testedFunctionInfo: FunctionInfo,
        testedClassConstructorParamTypeMap: Map<string, string>,
        testCaseName: string,
        mockedFunctions: FunctionInfo[],
        outputCode: string,
        caseDescription: string,
    ) {
        super(indentLevel, testedClassConstructorParamTypes, testedFunctionInfo, testedClassConstructorParamTypeMap, testCaseName, mockedFunctions, outputCode);
        const flagArray = caseDescription.match(/(?<=\[)(\S+)(?=\])/g);
        if (flagArray === null || flagArray.length < 3) {
            // TODO: may be continue?
            throw new Error("Invalid flag array");
        }
        this.isExceptionCase = flagArray[0] === "exception";
        this.isMockFuncThrowException = flagArray[1] === "mockFuncThrowException";
        this.testCaseName = flagArray[2];
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
        this.AppendLineIndented(`public void Test${this.testedFunctionInfo.functionName}${this.testCaseName}()`);
        this.AppendLineIndented("{");
        this.IndentedLevelUp();

        // Arrange in test method
        this.AppendLineIndented("// Arrange");
        this.mockedObjects.forEach((value: string, key: string) => {
            this.AppendLineIndented(`var ${value} = new Mock<${key}>();`);
        });

        if (this.isExceptionCase) {
            this.GenerateFunctionBodyException();
        } else {
            if (this.testedFunctionInfo.output.type === "void") {
                this.GenerateFunctionBodyNoExceptionWithVoid();
            } else {
                this.GenerateFunctionBodyNoExceptionWithoutVoid();
            }
        }

        this.IndentedLevelDown();
        this.AppendLineIndented("}");
        return this.outputCode;
    }

    protected GenerateMockedFuncParasAnyBlock(paras: ObjectInfo[]): void {
        this.IndentedLevelUp();
        const length = paras.length;
        for (var index = 0; index < length; index++) {
            const param = paras[index];
            this.AppendLineIndented(`It.IsAny<${param.type}>()${index !== length - 1 ? "," : ""}`);
        }
        this.IndentedLevelDown();
    }
    
    private GenerateFunctionBodyException(): void {
        for (const func of this.mockedFunctions) {
            const interfaceType = this.testedClassConstructorParamTypeMap.get(func.belongedClassName);
            if (interfaceType) {
                this.AppendLineIndented(`${this.mockedObjects.get(interfaceType)}.Setup(x => x.${func.functionName}(`);
                this.GenerateMockedFuncParasAnyBlock(func.inputParams);
                this.outputCode += "))";
                if (this.isMockFuncThrowException) {
                    this.AppendLineIndented(`.Throws<Exception>();`);
                } else {
                    this.AppendLineIndented(`.Returns(${this.ObjectToCSharpCode(func.output.value, func.output.type)});`);
                }
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

        // Act
        this.AppendLineIndented("// Act");
        this.AppendLineIndented(`Action act = () => instance.${this.testedFunctionInfo.functionName}(`);
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
        this.AppendLineIndented("act.Should().Throw<Exception>();");
    }

    private GenerateFunctionBodyNoExceptionWithVoid(): void {
        for (const func of this.mockedFunctions) {
            const interfaceType = this.testedClassConstructorParamTypeMap.get(func.belongedClassName);
            if (interfaceType) {
                this.AppendLineIndented(`${this.mockedObjects.get(interfaceType)}.Setup(x => x.${func.functionName}(`);
                this.GenerateMockedFuncParasAnyBlock(func.inputParams);
                this.outputCode += "))";
                if (this.isMockFuncThrowException) {
                    this.AppendLineIndented(`.Throws<Exception>();`);
                } else {
                    this.AppendLineIndented(`.Returns(${this.ObjectToCSharpCode(func.output.value, func.output.type)});`);
                }
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

        // Act
        this.AppendLineIndented("// Act");
        this.AppendLineIndented(`Action act = () => instance.${this.testedFunctionInfo.functionName}(`);
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
        this.AppendLineIndented(`act.Should().NotThrow();`);
    }

    private GenerateFunctionBodyNoExceptionWithoutVoid(): void {
        this.AppendLineIndented(`var expected = ${this.ObjectToCSharpCode(this.testedFunctionInfo.output.value, this.testedFunctionInfo.output.type)};`);
        for (const func of this.mockedFunctions) {
            const interfaceType = this.testedClassConstructorParamTypeMap.get(func.belongedClassName);
            if (interfaceType) {
                this.AppendLineIndented(`${this.mockedObjects.get(interfaceType)}.Setup(x => x.${func.functionName}(`);
                this.GenerateMockedFuncParasAnyBlock(func.inputParams);
                this.outputCode += "))";
                if (this.isMockFuncThrowException) {
                    this.AppendLineIndented(`.Throws<Exception>();`);
                } else {
                    this.AppendLineIndented(`.Returns(${this.ObjectToCSharpCode(func.output.value, func.output.type)});`);
                }
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

        // Act
        this.AppendLineIndented("// Act");
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

        // Assert in test method
        this.AppendLineIndented("// Assert");
        switch (this.testedFunctionInfo.output.type) {
            case "int":
            case "bool":
            case "Guid":
                this.AppendLineIndented("actual.Should().Be(expected);");
                break;
            default:
                this.AppendLineIndented("actual.Should().BeEquivalentTo(expected);");
        }
    }
}