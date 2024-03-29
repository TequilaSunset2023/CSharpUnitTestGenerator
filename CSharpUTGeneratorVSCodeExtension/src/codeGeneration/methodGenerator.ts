import { CodeGeneratorBase } from './codeGeneratorBase'

export abstract class MethodGenerator extends CodeGeneratorBase {
    protected attributes: string[] = [];
    public SetIndentLevel(level: number): void {
        this.indentLevel = level;
    }

    public SetAttributes(attributes: string[]): void {
        this.attributes = attributes;
    }

    public abstract GetUsedNamespaces(): string[]
}