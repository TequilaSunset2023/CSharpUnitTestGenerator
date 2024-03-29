export abstract class CodeGeneratorBase {

    constructor(
        protected indentLevel: number = 0,
        protected outputCode: string = ""
    ) { }

    public abstract GetOutputCodeBlock(): Promise<string>;

    protected AppendIndent(): void {
        this.outputCode += "\n";
        for (let i = 0; i < this.indentLevel; i++) {
            this.outputCode += "    ";
        }
    }

    protected AppendLineIndented(line?: string): void {
        this.AppendIndent();
        this.outputCode += line ?? "";
    }

    protected AppendLineInFileStarted(line?: string): void {
        this.outputCode += line ?? "";
    }

    protected IndentedLevelUp(): void {
        this.indentLevel++;
    }

    protected IndentedLevelDown(): void {
        this.indentLevel--;
    }

}