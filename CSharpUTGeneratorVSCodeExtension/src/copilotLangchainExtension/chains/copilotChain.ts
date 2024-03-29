import { BaseChain, ChainInputs,  } from "langchain/chains";
import { CopilotAsLLM } from "../llms/copilotAsLLM";
import { BasePromptTemplate } from "langchain/prompts";
import { ChainValues } from "langchain/schema";
import { CallbackManagerForChainRun, Callbacks } from "langchain/callbacks";
import { BaseLLMOutputParser, BaseOutputParser } from "langchain/schema/output_parser";
import { NoOpOutputParser } from "../outputParsers/noop";

export interface CopilotChainInput<T extends string | string[] | object = string> extends ChainInputs {
  /** Prompt object to use */
  promptTemplate: BasePromptTemplate;
  /** LLM Wrapper to use */
  llm: CopilotAsLLM;
  /** Kwargs to pass to LLM */
  llmKwargs?: this["llm"]["CallOptions"];
  /** OutputParser to use */
  outputParser?: BaseLLMOutputParser<T>;
  /** Key to use for output, defaults to `text` */
  outputKey?: string;
}

export class CopilotChain<T extends string | string[] | object = string> extends BaseChain implements CopilotChainInput<T>
{
    promptTemplate: BasePromptTemplate;
  
    llm: CopilotAsLLM;
  
    llmKwargs?: this["llm"]["CallOptions"];

    outputParser?: BaseLLMOutputParser<T>;
  
    outputKey = "text";
  
    get inputKeys() {
      return this.promptTemplate.inputVariables;
    }
  
    get outputKeys() {
      return [this.outputKey];
    }

    _chainType() {
        return "CopilotChain" as const;
    }

    constructor(fields: CopilotChainInput<T>) {
        super(fields);
        this.promptTemplate = fields.promptTemplate;
        this.llm = fields.llm;
        this.llmKwargs = fields.llmKwargs;
        this.outputKey = fields.outputKey ?? this.outputKey;
        this.outputParser =
        fields.outputParser ?? (new NoOpOutputParser() as BaseOutputParser<T>);
        if (this.promptTemplate.outputParser) {
          if (fields.outputParser) {
            throw new Error("Cannot set both outputParser and prompt.outputParser");
          }
          this.outputParser = this.promptTemplate.outputParser as BaseOutputParser<T>;
        }
    }

      /**
   * Run the core logic of this chain and add to output if desired.
   *
   * Wraps _call and handles memory.
   */
  call(
    values: ChainValues & this["llm"]["CallOptions"],
    callbacks?: Callbacks | undefined
  ): Promise<ChainValues> {
    return super.call(values, callbacks);
  }

  /** @ignore */
  async _call(
    values: ChainValues & this["llm"]["CallOptions"],
    runManager?: CallbackManagerForChainRun
  ): Promise<ChainValues> {
    const valuesForPrompt = { ...values };
    const valuesForLLM: this["llm"]["CallOptions"] = {
      ...this.llmKwargs,
    };
    for (const key of this.llm.callKeys) {
      if (key in values) {
        valuesForLLM[key as keyof this["llm"]["CallOptions"]] = values[key];
        delete valuesForPrompt[key];
      }
    }
    const promptValue = await this.promptTemplate.formatPromptValue(valuesForPrompt);
    const { generations } = await this.llm.generatePrompt(
      [promptValue],
      valuesForLLM,
      runManager?.getChild()
    );
    return {
      [this.outputKey]: generations[0][0].text,
    };
  }

}
