import { TestedObjectCreationStyle } from './testedObjectCreationStyle'

/**
 * Defines a mock framework.
 * The "Code" properties can have placeholders for formatting, and can be later customized by the user.
 */
export class MockFramework {
    constructor(public name: string,
        public detectionReferenceMatches?: ReadonlyArray<string> | null,
        public detectionRank?: number | null,
        public usingNamespaces?: ReadonlyArray<string> | null,
        public supportsGenerics?: boolean | null,
        public classStartCode?: string | null,
        public hasMockFields?: boolean | null,
        public initializeStartCode?: string | null,
        public mockFieldDeclarationCode?: string | null,
        public mockFieldInitializationCode?: string | null,
        public testCleanupCode?: string | null,
        public testArrangeCode?: string | null,
        public testedObjectCreationStyle?: TestedObjectCreationStyle | null,
        public testedObjectCreationCode?: string | null,
        public mockObjectReferenceCode?: string | null,
        public assertStatement?: string | null) { }

    /**
     * Whether the mock framework has test cleanup.
     */
    public get hasTestCleanup(): boolean {
        return !!this.testCleanupCode;
    }

    public toString(): string {
        return this.name;
    }
}
