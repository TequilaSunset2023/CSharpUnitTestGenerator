import { MockFramework } from './Entity/mockFramework';
import { TestFramework } from './Entity/testFramework';
import { TestCleanupStyle } from './Entity/testCleanupStyle';
import { CodeGeneratorBase } from './codeGeneratorBase';
import { MethodGenerator } from './methodGenerator';

export class TestFileGenerator extends CodeGeneratorBase {
    private systemUsingStatement: string[] = [
        'using System',
        'using System.Collections.Generic',
        'using System.IO',
        'using System.Linq',
        'using System.Text',
        'using System.Threading.Tasks'
    ];
    private usingStatements: string[] = [
        "using FluentAssertions",
        "using Newtonsoft.Json",
    ];

    constructor(
        private testFramework: TestFramework,
        private mockFramework: MockFramework,
        private namespace: string,
        private className: string,
        private methodGenerators: MethodGenerator[],
    ) {
        super();
        if (testFramework.usingNamespace) {
            this.usingStatements.push(testFramework.usingNamespace);
        }
        if (mockFramework.usingNamespaces) {
            this.usingStatements = this.usingStatements.concat(mockFramework.usingNamespaces);
        }
        for (const methodGenerator of methodGenerators) {
            this.usingStatements = this.usingStatements.concat(methodGenerator.GetUsedNamespaces());
        }
        const systemNamespaces = this.usingStatements.filter(statement => statement.startsWith("using System"));
        const otherNamespaces = this.usingStatements.filter(statement => !statement.startsWith("using System"));
        const otherNamespacesUniqueSorted = Array.from(new Set(otherNamespaces)).sort();
        this.usingStatements = Array.from(new Set(this.systemUsingStatement.concat(systemNamespaces))).sort().concat(otherNamespacesUniqueSorted);
        this.usingStatements = this.usingStatements.map(statement => statement + ";");
    }

    public async GetOutputCodeBlock(): Promise<string> {
        // copyright
        this.AppendLineInFileStarted(`// <copyright file="${this.className}.test.cs" company="Microsoft">`);
        this.AppendLineIndented("//     Copyright (c) Microsoft Corporation.  All rights reserved.");
        this.AppendLineIndented("// </copyright>");
        this.AppendLineIndented();

        // using
        for (const usingStatement of this.usingStatements) {
            this.AppendLineIndented(`${usingStatement}`);
        }
        this.AppendLineIndented();

        // namespace
        this.AppendLineIndented(`namespace UnitTestDemo`);
        this.AppendLineIndented("{");
        this.IndentedLevelUp();

        // test class documention
        this.AppendLineIndented("/// <summary>");
        this.AppendLineIndented(`/// ${this.className}Tests`);
        this.AppendLineIndented("/// <summary>");

        // test class attribute
        if (this.testFramework.testClassAttribute) {
            this.AppendLineIndented(`[${this.testFramework.testClassAttribute}]`);
        }

        // test class declaration
        this.AppendIndent();
        this.outputCode += `public class ${this.className}Tests`;
        if (this.mockFramework.hasTestCleanup && this.testFramework.testCleanupStyle == TestCleanupStyle.Disposable) {
            this.outputCode += " implements IDisposable";
        }
        this.AppendLineIndented("{");
        this.IndentedLevelUp();

        const length = this.methodGenerators.length;
        for (var index = 0; index < length; index++) {
            const methodGenerator = this.methodGenerators[index];
            methodGenerator.SetIndentLevel(this.indentLevel);
            if (this.testFramework.testMethodAttribute) {
                methodGenerator.SetAttributes([this.testFramework.testMethodAttribute]);
            }
            this.outputCode += await methodGenerator.GetOutputCodeBlock();
            if (index !== length - 1) {
                this.AppendLineIndented();
            }
        }

        this.IndentedLevelDown();
        this.AppendLineIndented("}");
        this.IndentedLevelDown();
        this.AppendLineIndented("}");

        return this.outputCode;
    }
}