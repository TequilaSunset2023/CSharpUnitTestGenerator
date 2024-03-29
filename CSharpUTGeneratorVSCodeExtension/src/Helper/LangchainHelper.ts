import { CopilotAsLLM, CopilotChain, COPILOT_CHAT_PROMPT, COPILOT_CODE_GEN_PROMPT, COPILOT_CODE_GEN_PROMPT_IN_EXISTING_FILE, BOUNDARY_CASES_CODE_GEN_PROMPT, BOUNDARY_CASES_CODE_GEN_PROMPT_IN_EXISTING_FILE, BOUNDARY_CASES_FUNCTION_INPUT_LIST_PROMPT } from '../copilotLangchainExtension';
import { OpenAIChat } from 'langchain/llms';
import { LLMChain } from 'langchain/chains';

export abstract class LangchainHelper {
    public static getBoundaryCasesCodeGenChain(utFilePath: string, createNewOutputFileFlag: boolean = true){
        return new CopilotChain({
            promptTemplate: createNewOutputFileFlag ? BOUNDARY_CASES_CODE_GEN_PROMPT : BOUNDARY_CASES_CODE_GEN_PROMPT_IN_EXISTING_FILE, 
            llm: new CopilotAsLLM(utFilePath, false),
            outputKey: "boundaryCasesCode",
        });
    }

    public static getBoundaryCasesListChain(modelName: string, azureOpenAIApiVersion: string, 
        azureOpenAIApiKey: string, azureOpenAIBasePath: string, azureOpenAIApiDeploymentName: string){
        const configuration = {
            modelName,
            azureOpenAIApiVersion,
            azureOpenAIApiKey,
            azureOpenAIBasePath,
            azureOpenAIApiDeploymentName,
            temperature: 0.3,
            maxTokens: 10000
        };
        return new LLMChain({
            prompt: COPILOT_CHAT_PROMPT, 
            llm: new OpenAIChat(configuration),
            outputKey: "boundaryCasesList", verbose: true
        });
    }
    
    public static getNormalCaseCodeGenChain(utFilePath: string, createNewOutputFlag: boolean = true){
        return new CopilotChain({
            promptTemplate: createNewOutputFlag ? COPILOT_CODE_GEN_PROMPT : COPILOT_CODE_GEN_PROMPT_IN_EXISTING_FILE, 
            llm: new CopilotAsLLM(utFilePath),
            outputKey: "normalCaseCode"
        });
    }


    public static getBoundaryCasesFunctionInputListChain(modelName: string, azureOpenAIApiVersion: string, 
        azureOpenAIApiKey: string, azureOpenAIBasePath: string, azureOpenAIApiDeploymentName: string){
        const configuration = {
            modelName,
            azureOpenAIApiVersion,
            azureOpenAIApiKey,
            azureOpenAIBasePath,
            azureOpenAIApiDeploymentName,
            temperature: 0.3,
            maxTokens: 10000
        };
        return new LLMChain({
            prompt: BOUNDARY_CASES_FUNCTION_INPUT_LIST_PROMPT, 
            llm: new OpenAIChat(configuration),
            outputKey: "boundaryCasesFunctionInputList", verbose: true
        });
    }
}