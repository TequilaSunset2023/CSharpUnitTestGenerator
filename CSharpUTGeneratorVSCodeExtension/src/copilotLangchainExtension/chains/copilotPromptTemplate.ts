import { PromptTemplate } from "langchain/prompts";

const chatTemplateString = `Here is an empty unit test file, please generate the answer of following question as comments into this empty file.

question:

{question}`

export const COPILOT_CHAT_PROMPT = PromptTemplate.fromTemplate(chatTemplateString);

const codeGenTemplateString = `Here is an empty unit test file, please generate code as following request asked in this empty file, DO NOT GENERATE IN OTHER FILES.

request:

{request}`

export const COPILOT_CODE_GEN_PROMPT = PromptTemplate.fromTemplate(codeGenTemplateString);

const codeGenTemplateStringInExistingFile = `Please generate code as following request asked in this file, DO NOT GENERATE IN OTHER FILES. Only [TestMethod] is needed, do not include [TestClass] and [TestInitialize].
request:
{request}`

export const COPILOT_CODE_GEN_PROMPT_IN_EXISTING_FILE = PromptTemplate.fromTemplate(codeGenTemplateStringInExistingFile);

const boundaryCasesCodeGenTemplateString = `Here is an unit test file, please help to add unit test code to test the following boundary test cases:
    
boundary test cases:
{boundaryCasesList}`
    
export const BOUNDARY_CASES_CODE_GEN_PROMPT = PromptTemplate.fromTemplate(boundaryCasesCodeGenTemplateString);

const boundaryCasesCodeGenInExistingFile = `Here are existing unit test functions. Please help to generate other unit tests to test the following boundary test cases. You can not only add new unit test functions to test cases but also add test cases directly in these existing functions. Only [TestMethod] is needed, do not include [TestClass] and [TestInitialize].
boundary test cases:
{boundaryCasesList}`
    
export const BOUNDARY_CASES_CODE_GEN_PROMPT_IN_EXISTING_FILE = PromptTemplate.fromTemplate(boundaryCasesCodeGenInExistingFile);

const boundaryCasesFunctionInputListTemplateString = `Here is an empty json file, please give me a list of inputs of testing function signature for each boundary cases shows below based on an example input which haved tested for normal case testing and testing function's signature.

testing function signature:
\`\`\`
{functionSignature}
\`\`\`

normal case input of the function(all parameters are valid):
\`\`\`
{functionInputInNormalCase}
\`\`\`

testing boundary cases list below, there are three tags quoted by square brackets like [noException], [mockFuncUnRelated] [SomethingLikeATestMethodName] in each testing boundary case, please ingnore all of them, they are just for marking:
\`\`\`
{boundaryCasesList}
\`\`\`

you can just use normal case input as function input in boundary case which has [mockFuncThrowException] tag,
output should be JSON formatted(NO COMMENTS SHOULD EXIST IN JSON FILE), 
correct output format example below, this example contains 3 groups of boundary case inputs, each group contains 2 parameters, and each group MUST be a list of values:
\`\`\`Json
[
    [boundary_case1_param1, boundary_case1_param2],
    [boundary_case2_param1, boundary_case2_param2],
    [boundary_case3_param1, boundary_case3_param2]
]
\`\`\`

Here is an example of boundary case input list when testing function has 2 parameters, first parameter is List<string>, second parameter is List<int>:
\`\`\`Json
[
    [["a", ""], [1, 2, 3]],
    [[], []]
]
\`\`\`

**Never set a group of boundary case inputs as null or empty list.**
**Clear all comments in the json file before submitting it.**
`;
    
export const BOUNDARY_CASES_FUNCTION_INPUT_LIST_PROMPT = PromptTemplate.fromTemplate(boundaryCasesFunctionInputListTemplateString);

const boundaryCasesFuncOutputGenTempStr = `Here is an empty json file, please give me expected output(ONLY OUTPUT IS NEEDED) of mocked function for boundary cases testing based on given information.

testing boundary case, there are tags like [noException], [mockFuncUnRelated] in case list, please ingnore them, they are just for marking:
\`\`\`
{testingBoundaryCase}
\`\`\`

tested valid input of testing function:
\`\`\`
{testingFuncInput}
\`\`\`

input of mocked function:
\`\`\`
{mockedFuncInput}
\`\`\`

output should be JSON formatted with no markdown grammatical(NO COMMENTS SHOULD EXIST IN JSON FILE), 
correct example(output in Json format, do not start with \`\`\`Json):

[
    [boundary_case1_param1, boundary_case1_param2, ...],
    [boundary_case2_param1, boundary_case2_param2, ...],
    [boundary_case3_param1, boundary_case3_param2, ...],
]


**Clear all comments in the json file before submitting it.**
`;
    
export const BOUNDARY_CASES_FUNC_OUTPUT_GEN_PROMPT = PromptTemplate.fromTemplate(boundaryCasesFuncOutputGenTempStr);
