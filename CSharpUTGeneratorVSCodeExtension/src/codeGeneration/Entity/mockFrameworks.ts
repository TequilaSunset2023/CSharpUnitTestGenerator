import { MockFramework } from './mockFramework'
import { TestedObjectCreationStyle } from './testedObjectCreationStyle'

export class MockFrameworks {
    public static readonly NoneName = "None";
    public static readonly MoqName = "Moq";
    public static readonly AutoMoqName = "AutoMoq";
    public static readonly SimpleStubsName = "SimpleStubs";
    public static readonly NSubstituteName = "NSubstitute";
    public static readonly RhinoMocksName = "Rhino Mocks";
    public static readonly FakeItEasyName = "FakeItEasy";
    public static readonly JustMockName = "JustMock";

    public static readonly List: ReadonlyArray<MockFramework> = [
        new MockFramework(
            MockFrameworks.NoneName,
            [],
            3,
            [],
            true,
            null,
            false,
            null,
            null,
            null,
            null,
            null,
            TestedObjectCreationStyle.TodoStub,
            null,
            null,
            null
        ),
        new MockFramework(
            MockFrameworks.MoqName,
            ["Moq"],
            2,
            ["using Moq"],
            true,
            "private MockRepository mockRepository;",
            true,
            "this.mockRepository = new MockRepository(MockBehavior.Strict);",
            "private Mock<$InterfaceType$> mock$InterfaceMockName$;",
            "this.mock$InterfaceMockName$ = this.mockRepository.Create<$InterfaceType$>();",
            null,
            null,
            TestedObjectCreationStyle.HelperMethod,
            null,
            "this.mock$InterfaceMockName$.Object",
            "this.mockRepository.VerifyAll();"
        ),
        new MockFramework(
            MockFrameworks.AutoMoqName,
            ["AutoMoq"],
            1,
            ["using AutoMoq", "using Moq"],
            true,
            null,
            false,
            null,
            null,
            null,
            null,
            "var mocker = new AutoMoqer();",
            TestedObjectCreationStyle.DirectCode,
            "mocker.Create<$ClassName$>();",
            null,
            null
        ),
        new MockFramework(
            MockFrameworks.SimpleStubsName,
            ["Etg.SimpleStubs", "SimpleStubs"],
            2,
            [],
            false,
            null,
            true,
            null,
            "private Stub$InterfaceName$ stub$InterfaceNameBase$;",
            "this.stub$InterfaceNameBase$ = new Stub$InterfaceName$();",
            null,
            null,
            TestedObjectCreationStyle.HelperMethod,
            null,
            "this.stub$InterfaceNameBase$",
            null
        ),
        new MockFramework(
            MockFrameworks.NSubstituteName,
            ["NSubstitute"],
            0,
            ["using NSubstitute"],
            true,
            null,
            true,
            null,
            "private $InterfaceType$ sub$InterfaceMockName$;",
            "this.sub$InterfaceMockName$ = Substitute.For<$InterfaceType$>();",
            null,
            null,
            TestedObjectCreationStyle.HelperMethod,
            null,
            "this.sub$InterfaceMockName$",
            null
        ),
        new MockFramework(
            MockFrameworks.RhinoMocksName,
            ["Rhino.Mocks", "RhinoMocks"],
            2,
            ["using Rhino.Mocks"],
            true,
            null,
            true,
            null,
            "private $InterfaceType$ stub$InterfaceMockName$;",
            "this.stub$InterfaceMockName$ = MockRepository.GenerateStub<$InterfaceType$>();",
            null,
            null,
            TestedObjectCreationStyle.HelperMethod,
            null,
            "this.stub$InterfaceMockName$",
            null
        ),
        new MockFramework(
            MockFrameworks.FakeItEasyName,
            ["FakeItEasy"],
            2,
            ["using FakeItEasy"],
            true,
            null,
            true,
            null,
            "private $InterfaceType$ fake$InterfaceMockName$;",
            "this.fake$InterfaceMockName$ = A.Fake<$InterfaceType$>();",
            null,
            null,
            TestedObjectCreationStyle.HelperMethod,
            null,
            "this.fake$InterfaceMockName$",
            null
        ),
        new MockFramework(
            MockFrameworks.JustMockName,
            ["JustMock", "Telerik.JustMock"],
            2,
            ["using Telerik.JustMock"],
            true,
            null,
            true,
            null,
            "private $InterfaceType$ mock$InterfaceMockName$;",
            "this.mock$InterfaceMockName$ = Mock.Create<$InterfaceType$>();",
            null,
            null,
            TestedObjectCreationStyle.HelperMethod,
            null,
            "this.mock$InterfaceMockName$",
            null
        ),
    ];

    public static Default: MockFramework;

    public static Get(name: string): MockFramework {
        const framework = this.List.filter(f => f.name === name);
        if (framework.length > 0) {
            return framework[0];
        } else {
            return this.Default;
        }
    };
}
