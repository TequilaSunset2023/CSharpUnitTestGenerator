import { ObjectInfo } from "./objectInfo";

export class FunctionInfo {
    constructor(
        public functionName: string,
        public functionSignature: string,
        public belongedClassName: string,
        public inputParams: ObjectInfo[],
        public output: ObjectInfo,
        public UsedNamespaces: string[]
    ) { }
}