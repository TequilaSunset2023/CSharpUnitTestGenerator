import * as vscode from 'vscode';
import * as fs from 'fs';
import { relative, normalize, isAbsolute, dirname } from 'path';
import { CodeGeneratorBase } from './codeGeneratorBase';
import { XMLParser, XMLBuilder, XMLValidator } from 'fast-xml-parser';

export class CsprojFileGenerator extends CodeGeneratorBase {
    constructor(
        private outputFilePath: string,
        private sourceProjectCsprojFileContent: string,
        private projectReferences: string[]
    ){
        super();
    }

    public async GetOutputCodeBlock(): Promise<string> {
        const parser = new XMLParser({
            ignoreAttributes: false,
            ignoreDeclaration: true,
            attributeNamePrefix: "",
            attributesGroupName: "attributes",
        });
        const parsed = parser.parse(this.sourceProjectCsprojFileContent).Project;
        const sdk = parsed?.attributes.Sdk;
        const targetFramework = parsed?.PropertyGroup?.TargetFramework;
        if (!parsed || !sdk || !targetFramework) { throw new Error("Invalid csproj file"); }
        var index = this.projectReferences.indexOf(this.outputFilePath);
        if (index > -1) {
            this.projectReferences.splice(index, 1);
        }
        const projRefXmlBlock: any[] = this.UpdatePackageReference(this.projectReferences);
        return this.BuildCsprojFile(sdk, targetFramework, projRefXmlBlock);
    }

    private UpdatePackageReference(csprojFilePaths: string[]): any[] {
        const projectReferences: any[] = [];
        for (const csprojFilePath of csprojFilePaths) {
            const relativePath = relative(dirname(this.outputFilePath), csprojFilePath);
            //const updatedInclude = normalize(`${dirname(relativePath)}\\${projectReference.attributes.Include}`)
            projectReferences.push({attributes: {Include: relativePath}});
        }
        return projectReferences;
    }

    private BuildCsprojFile(sdk: string, targetFramework: string, projectReferences: any[]): string {
        const input = {
            Project: {
                attributes: {
                    Sdk: sdk,
                },
                PropertyGroup: {
                    TargetFramework: targetFramework,
                    IsPackable: false,
                    DebugType: "portable"
                },
                ItemGroup: [
                    {
                        PackageReference: [
                            {attributes: {Include: "Microsoft.NET.Test.Sdk", Version: "16.7.1"}},
                            {attributes: {Include: "MSTest.TestFramework", Version: "2.1.1"}},
                            {attributes: {Include: "MSTest.TestAdapter", Version: "2.1.1"}},
                            {attributes: {Include: "Moq", Version: "4.16.1"}},
                            {attributes: {Include: "coverlet.collector", Version: "1.3.0"}},
                            {attributes: {Include: "Newtonsoft.Json", Version: "13.0.1"}},
                            {attributes: {Include: "FluentAssertions.MSFT_InternalOnly", Version: "6.7.0"}},
                        ]
                    },
                    {
                        ProjectReference: projectReferences,
                    }
                ]
            },
        };
        const builder = new XMLBuilder({
            format: true,
            ignoreAttributes: false,
            attributeNamePrefix: "",
            attributesGroupName: "attributes",
        });
        return builder.build(input);
    }
}