import { TestInitializeStyle } from './testInitializeStyle'
import { TestCleanupStyle } from './testCleanupStyle';



export class TestFramework {
    constructor(
        public readonly name: string,
        public readonly detectionReferenceMatches: ReadonlyArray<string> | null = null,
        public readonly detectionRank: number | null = null,
        public readonly usingNamespace: string | null = null,
        public readonly testClassAttribute: string | null = null,
        public readonly testMethodAttribute: string | null = null,
        public readonly testInitializeStyle: TestInitializeStyle | null = null,
        public readonly testInitializeAttribute: string | null = null,
        public readonly testCleanupStyle: TestCleanupStyle | null = null,
        public readonly testCleanupAttribute: string | null = null,
        public readonly assertFailStatement: string | null = null) {
    }

    public toString(): string {
        return this.name;
    }
}
