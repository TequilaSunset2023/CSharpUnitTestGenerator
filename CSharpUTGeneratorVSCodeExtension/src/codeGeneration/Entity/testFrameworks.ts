import { TestInitializeStyle } from './testInitializeStyle'
import { TestCleanupStyle } from './testCleanupStyle'
import { TestFramework } from './testFramework';

export class TestFrameworks {
    public static readonly VisualStudioName = "VisualStudio";
    public static readonly NUnitName = "NUnit";
    public static readonly XUnitName = "xUnit";

    public static readonly List: ReadonlyArray<TestFramework> = [
        new TestFramework(
            TestFrameworks.VisualStudioName,
            ["Microsoft.VisualStudio.QualityTools.UnitTestFramework", "Microsoft.VisualStudio.TestPlatform.TestFramework"],
            1,
            "using Microsoft.VisualStudio.TestTools.UnitTesting",
            "TestClass",
            "TestMethod",
            TestInitializeStyle.AttributedMethod,
            "TestInitialize",
            TestCleanupStyle.AttributedMethod,
            "TestCleanup",
            "Assert.Fail();"
        ),
        new TestFramework(
            TestFrameworks.NUnitName,
            ["NUnit", "NUnit.Framework"],
            0,
            "using NUnit.Framework",
            "TestFixture",
            "Test",
            TestInitializeStyle.AttributedMethod,
            "SetUp",
            TestCleanupStyle.AttributedMethod,
            "TearDown",
            "Assert.Fail();"
        ),
        new TestFramework(
            TestFrameworks.XUnitName,
            ["xunit", "xunit.core"],
            0,
            "using Xunit",
            null,
            "Fact",
            TestInitializeStyle.Constructor,
            null,
            TestCleanupStyle.Disposable,
            null,
            "Assert.True(false);"
        ),
    ];

    public static readonly Default = TestFrameworks.List[0];

    public static Get(name: string): TestFramework {
        const framework = this.List.filter(f => f.name === name);
        if (framework.length > 0) {
            return framework[0];
        } else {
            return this.Default;
        }
    }
}
